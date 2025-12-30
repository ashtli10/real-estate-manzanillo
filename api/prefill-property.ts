import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PREFILL_WEBHOOK_URL = process.env.PREFILL_PROPERTY_WEBHOOK_URL || '';
const PREFILL_WEBHOOK_AUTH = process.env.PREFILL_PROPERTY_WEBHOOK_AUTH || '';

// Cost in credits for each prefill request
const PREFILL_CREDIT_COST = 2;

// Timeout for external webhook call (in ms)
const WEBHOOK_TIMEOUT_MS = 25000;

// Initialize Supabase with service role key (bypasses RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Types for characteristic validation
interface CharacteristicDefinition {
  key: string;
  label: string;
  type: 'boolean' | 'number';
}

interface PropertyCharacteristic {
  id: string;
  key: string;
  label: string;
  type: 'boolean' | 'number';
  value: number | boolean;
  description?: string;
}

interface PrefillRequest {
  raw_text: string;
  language?: 'es' | 'en';
  default_currency?: string;
  property_types: string[];
  currencies: string[];
  characteristic_definitions: CharacteristicDefinition[];
}

interface PrefillResponse {
  title?: string;
  description?: string;
  price?: number | null;
  currency?: string | null;
  is_for_sale?: boolean;
  is_for_rent?: boolean;
  rent_price?: number | null;
  rent_currency?: string | null;
  property_type?: string | null;
  custom_bonuses?: string[];
  characteristics?: PropertyCharacteristic[];
}

/**
 * Validates and filters characteristics returned by the AI against known definitions.
 * Only keeps characteristics whose keys match the provided definitions.
 */
function validateCharacteristics(
  characteristics: PropertyCharacteristic[] | undefined,
  definitions: CharacteristicDefinition[]
): PropertyCharacteristic[] {
  if (!Array.isArray(characteristics) || characteristics.length === 0) {
    return [];
  }

  // Create a Set of valid keys for O(1) lookup
  const validKeys = new Set(definitions.map((d) => d.key));
  
  // Create a map for type lookup
  const definitionMap = new Map(definitions.map((d) => [d.key, d]));

  const validatedCharacteristics: PropertyCharacteristic[] = [];

  for (const char of characteristics) {
    // Skip if no key or key doesn't match any definition
    if (!char.key || !validKeys.has(char.key)) {
      console.log(`Skipping unknown characteristic: ${char.key}`);
      continue;
    }

    const definition = definitionMap.get(char.key);
    if (!definition) continue;

    // Validate the type matches
    if (char.type !== definition.type) {
      console.log(`Type mismatch for ${char.key}: expected ${definition.type}, got ${char.type}`);
      // Auto-correct the type to match the definition
      char.type = definition.type;
    }

    // Validate value based on type
    if (definition.type === 'boolean') {
      // Ensure value is a boolean
      char.value = Boolean(char.value);
    } else if (definition.type === 'number') {
      // Ensure value is a number
      const numValue = Number(char.value);
      if (isNaN(numValue)) {
        console.log(`Invalid number value for ${char.key}: ${char.value}`);
        continue; // Skip invalid numeric values
      }
      char.value = numValue;
    }

    // Ensure the label matches the definition
    char.label = definition.label;

    validatedCharacteristics.push(char);
  }

  return validatedCharacteristics;
}

/**
 * Extracts user ID from the Authorization header JWT token
 */
async function getUserFromToken(authHeader: string | undefined): Promise<{ userId: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Verify the token using Supabase Auth
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    console.error('Auth error:', error);
    return null;
  }

  return { userId: user.id };
}

/**
 * Deducts credits from user account directly using service role.
 * Deducts from free credits first, then from paid balance.
 * Creates a transaction record for audit trail.
 */
async function deductCredits(userId: string, amount: number, description: string): Promise<boolean> {
  try {
    // 1. Get current credits
    const { data: credits, error: fetchError } = await supabaseAdmin
      .from('credits')
      .select('id, balance, free_credits_remaining')
      .eq('user_id', userId)
      .single();

    if (fetchError || !credits) {
      console.error('Error fetching credits:', fetchError);
      return false;
    }

    const freeRemaining = credits.free_credits_remaining ?? 0;
    const paidBalance = credits.balance ?? 0;
    const totalAvailable = freeRemaining + paidBalance;

    // 2. Check if user has enough credits
    if (totalAvailable < amount) {
      console.error(`Insufficient credits: need ${amount}, have ${totalAvailable}`);
      return false;
    }

    // 3. Calculate deduction split (free first, then paid)
    let freeDeduction = 0;
    let paidDeduction = 0;

    if (freeRemaining >= amount) {
      // All from free credits
      freeDeduction = amount;
    } else {
      // Use all free, rest from paid
      freeDeduction = freeRemaining;
      paidDeduction = amount - freeRemaining;
    }

    // 4. Update credits table
    const { error: updateError } = await supabaseAdmin
      .from('credits')
      .update({
        free_credits_remaining: freeRemaining - freeDeduction,
        balance: paidBalance - paidDeduction,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating credits:', updateError);
      return false;
    }

    // 5. Create transaction record for audit trail
    const { error: txError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: -amount, // Negative for deduction
        type: 'used',
        description,
        metadata: {
          free_deducted: freeDeduction,
          paid_deducted: paidDeduction,
          source: 'prefill-property-api',
        },
      });

    if (txError) {
      // Log but don't fail - credits were already deducted
      console.error('Error creating transaction record:', txError);
    }

    return true;
  } catch (err) {
    console.error('Unexpected error in deductCredits:', err);
    return false;
  }
}

/**
 * Gets user's current credit balance
 */
async function getUserCredits(userId: string): Promise<{ total: number; free: number; paid: number } | null> {
  const { data, error } = await supabaseAdmin
    .from('credits')
    .select('balance, free_credits_remaining')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching credits:', error);
    return null;
  }

  if (!data) {
    return { total: 0, free: 0, paid: 0 };
  }

  const free = data.free_credits_remaining ?? 0;
  const paid = data.balance ?? 0;
  return { total: free + paid, free, paid };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check configuration
  if (!PREFILL_WEBHOOK_URL || !PREFILL_WEBHOOK_AUTH) {
    console.error('Missing PREFILL webhook configuration');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // 1. Authenticate the user
    const authResult = await getUserFromToken(req.headers.authorization);
    if (!authResult) {
      return res.status(401).json({ error: 'No autorizado. Inicia sesión para continuar.' });
    }

    const { userId } = authResult;

    // 2. Check user has enough credits
    const credits = await getUserCredits(userId);
    if (!credits || credits.total < PREFILL_CREDIT_COST) {
      return res.status(402).json({ 
        error: `Créditos insuficientes. Necesitas ${PREFILL_CREDIT_COST} créditos. Tienes ${credits?.total ?? 0}.`,
        credits_required: PREFILL_CREDIT_COST,
        credits_available: credits?.total ?? 0,
      });
    }

    // 3. Parse and validate request body
    const body = req.body as PrefillRequest;
    
    if (!body.raw_text || typeof body.raw_text !== 'string' || !body.raw_text.trim()) {
      return res.status(400).json({ error: 'Proporciona texto para prefillar.' });
    }

    if (!Array.isArray(body.characteristic_definitions)) {
      return res.status(400).json({ error: 'characteristic_definitions is required' });
    }

    // 4. Deduct credits BEFORE calling the external service
    const deducted = await deductCredits(userId, PREFILL_CREDIT_COST, 'AI Property Prefill');
    if (!deducted) {
      return res.status(402).json({ 
        error: 'No se pudieron descontar los créditos. Verifica tu saldo.',
      });
    }

    // 5. Call the external AI webhook
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    let webhookResponse: Response;
    try {
      webhookResponse = await fetch(PREFILL_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: PREFILL_WEBHOOK_AUTH,
        },
        body: JSON.stringify({
          raw_text: body.raw_text,
          language: body.language ?? 'es',
          default_currency: body.default_currency ?? 'MXN',
          property_types: body.property_types ?? [],
          currencies: body.currencies ?? ['MXN', 'USD'],
          characteristic_definitions: body.characteristic_definitions,
        }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      // Note: Credits are already deducted - this is intentional to prevent abuse
      // Users can contact support for refunds in case of genuine errors
      console.error('Webhook fetch error:', fetchError);
      return res.status(502).json({ 
        error: 'Error al conectar con el servicio de IA. Intenta de nuevo más tarde.',
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`Webhook error ${webhookResponse.status}:`, errorText.slice(0, 500));
      return res.status(502).json({ 
        error: 'El servicio de IA devolvió un error. Intenta de nuevo.',
      });
    }

    const responseText = await webhookResponse.text();
    if (!responseText.trim()) {
      return res.status(502).json({ 
        error: 'El servicio de IA no devolvió contenido.',
      });
    }

    let parsed: PrefillResponse;
    try {
      parsed = JSON.parse(responseText) as PrefillResponse;
    } catch {
      console.error('Failed to parse webhook response:', responseText.slice(0, 500));
      return res.status(502).json({ 
        error: 'Respuesta del servicio de IA no es válida.',
      });
    }

    // 6. Validate characteristics against provided definitions
    const validatedCharacteristics = validateCharacteristics(
      parsed.characteristics,
      body.characteristic_definitions
    );

    // 7. Build and return the validated response
    const result: PrefillResponse = {
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      price: parsed.price ?? null,
      currency: parsed.currency ?? null,
      is_for_sale: Boolean(parsed.is_for_sale),
      is_for_rent: Boolean(parsed.is_for_rent),
      rent_price: parsed.rent_price ?? null,
      rent_currency: parsed.rent_currency ?? null,
      property_type: parsed.property_type ?? null,
      custom_bonuses: Array.isArray(parsed.custom_bonuses) ? parsed.custom_bonuses : [],
      characteristics: validatedCharacteristics,
    };

    return res.status(200).json(result);

  } catch (error) {
    console.error('Prefill handler error:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor. Intenta de nuevo.',
    });
  }
}
