/**
 * AI Prefill Edge Function
 * 
 * Handles AI-powered property form prefilling.
 * Deducts credits before calling the external n8n webhook.
 * 
 * POST body:
 * {
 *   raw_text: string,              // User's property description text
 *   language?: 'es' | 'en',        // Default: 'es'
 *   default_currency?: string,     // Default: 'MXN'
 *   property_types: string[],      // Valid property types
 *   currencies: string[],          // Valid currencies
 *   characteristic_definitions: CharacteristicDefinition[]
 * }
 * 
 * Requires: Authorization header with valid Supabase JWT
 * Cost: 2 credits
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getUserFromAuth, createAdminClient } from '../_shared/supabase-client.ts';
import { deductCredits, getUserCredits } from '../_shared/credits.ts';

// Cost in credits for each prefill request
const PREFILL_CREDIT_COST = 2;

// Timeout for external webhook call (in ms)
const WEBHOOK_TIMEOUT_MS = 25000;

// Environment variables
const N8N_PREFILL_WEBHOOK = Deno.env.get('N8N_PREFILL_WEBHOOK')!;
const N8N_WEBHOOK_AUTH = Deno.env.get('N8N_WEBHOOK_AUTH')!;

// Types
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
 */
function validateCharacteristics(
  characteristics: PropertyCharacteristic[] | undefined,
  definitions: CharacteristicDefinition[]
): PropertyCharacteristic[] {
  if (!Array.isArray(characteristics) || characteristics.length === 0) {
    return [];
  }

  const validKeys = new Set(definitions.map((d) => d.key));
  const definitionMap = new Map(definitions.map((d) => [d.key, d]));
  const validatedCharacteristics: PropertyCharacteristic[] = [];

  for (const char of characteristics) {
    if (!char.key || !validKeys.has(char.key)) {
      console.log(`Skipping unknown characteristic: ${char.key}`);
      continue;
    }

    const definition = definitionMap.get(char.key);
    if (!definition) continue;

    // Validate type matches
    if (char.type !== definition.type) {
      console.log(`Type mismatch for ${char.key}: expected ${definition.type}, got ${char.type}`);
      char.type = definition.type;
    }

    // Validate value based on type
    if (definition.type === 'boolean') {
      char.value = Boolean(char.value);
    } else if (definition.type === 'number') {
      const numValue = Number(char.value);
      if (isNaN(numValue)) {
        console.log(`Invalid number value for ${char.key}: ${char.value}`);
        continue;
      }
      char.value = numValue;
    }

    // Ensure label matches definition
    char.label = definition.label;
    validatedCharacteristics.push(char);
  }

  return validatedCharacteristics;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check configuration
  if (!N8N_PREFILL_WEBHOOK || !N8N_WEBHOOK_AUTH) {
    console.error('Missing N8N webhook configuration');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 1. Authenticate the user
    const authHeader = req.headers.get('Authorization');
    const user = await getUserFromAuth(authHeader);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado. Inicia sesión para continuar.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check user has enough credits
    const credits = await getUserCredits(user.id);
    if (!credits || credits.total < PREFILL_CREDIT_COST) {
      return new Response(
        JSON.stringify({
          error: `Créditos insuficientes. Necesitas ${PREFILL_CREDIT_COST} créditos. Tienes ${credits?.total ?? 0}.`,
          credits_required: PREFILL_CREDIT_COST,
          credits_available: credits?.total ?? 0,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse and validate request body
    const body: PrefillRequest = await req.json();

    if (!body.raw_text || typeof body.raw_text !== 'string' || !body.raw_text.trim()) {
      return new Response(
        JSON.stringify({ error: 'Proporciona texto para prefillar.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(body.characteristic_definitions)) {
      return new Response(
        JSON.stringify({ error: 'characteristic_definitions is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Deduct credits BEFORE calling the external service
    const deducted = await deductCredits(user.id, PREFILL_CREDIT_COST, 'IA Autocompletado');
    if (!deducted) {
      return new Response(
        JSON.stringify({ error: 'No se pudieron descontar los créditos. Verifica tu saldo.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Call the external AI webhook
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    let webhookResponse: Response;
    try {
      webhookResponse = await fetch(N8N_PREFILL_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: N8N_WEBHOOK_AUTH,
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
      console.error('Webhook fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Error al conectar con el servicio de IA. Intenta de nuevo más tarde.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`Webhook error ${webhookResponse.status}:`, errorText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: 'El servicio de IA devolvió un error. Intenta de nuevo.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseText = await webhookResponse.text();
    if (!responseText.trim()) {
      return new Response(
        JSON.stringify({ error: 'El servicio de IA no devolvió contenido.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsed: PrefillResponse;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse webhook response:', responseText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: 'Respuesta del servicio de IA no es válida.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Prefill handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor. Intenta de nuevo.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
