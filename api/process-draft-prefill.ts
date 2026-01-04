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

// Characteristic definitions for AI extraction
const CHARACTERISTIC_DEFINITIONS = [
  { key: 'bedrooms', label: 'Recámaras', type: 'number' },
  { key: 'bathrooms', label: 'Baños', type: 'number' },
  { key: 'half_bathrooms', label: 'Medios baños', type: 'number' },
  { key: 'parking_spaces', label: 'Estacionamientos', type: 'number' },
  { key: 'construction_size', label: 'Construcción (m²)', type: 'number' },
  { key: 'lot_size', label: 'Terreno (m²)', type: 'number' },
  { key: 'floors', label: 'Pisos', type: 'number' },
  { key: 'year_built', label: 'Año de construcción', type: 'number' },
  { key: 'furnished', label: 'Amueblado', type: 'boolean' },
  { key: 'pool', label: 'Alberca', type: 'boolean' },
  { key: 'garden', label: 'Jardín', type: 'boolean' },
  { key: 'gym', label: 'Gimnasio', type: 'boolean' },
  { key: 'security', label: 'Seguridad 24h', type: 'boolean' },
  { key: 'air_conditioning', label: 'Aire acondicionado', type: 'boolean' },
];

const PROPERTY_TYPES = ['casa', 'departamento', 'terreno', 'local', 'oficina', 'bodega', 'edificio', 'rancho', 'quinta'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { draft_id, user_id } = req.body;

    if (!draft_id || !user_id) {
      return res.status(400).json({ error: 'Missing draft_id or user_id' });
    }

    // Get the draft
    const { data: draft, error: draftError } = await supabaseAdmin
      .from('property_drafts')
      .select('*')
      .eq('id', draft_id)
      .eq('user_id', user_id)
      .single();

    if (draftError || !draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const aiText = draft.ai_text;
    if (!aiText || !aiText.trim()) {
      return res.status(400).json({ error: 'No AI text to process' });
    }

    // Check user credits
    const { data: credits } = await supabaseAdmin
      .from('credits')
      .select('balance, free_credits_remaining')
      .eq('user_id', user_id)
      .single();

    const totalCredits = (credits?.balance || 0) + (credits?.free_credits_remaining || 0);
    if (totalCredits < PREFILL_CREDIT_COST) {
      // Update draft to mark AI processing failed
      await supabaseAdmin
        .from('property_drafts')
        .update({ 
          ai_text: null,
          current_step: 'ai' 
        })
        .eq('id', draft_id);
      
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    // Call the AI webhook
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    try {
      const webhookResponse = await fetch(PREFILL_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': PREFILL_WEBHOOK_AUTH,
        },
        body: JSON.stringify({
          raw_text: aiText,
          language: 'es',
          default_currency: 'MXN',
          property_types: PROPERTY_TYPES,
          currencies: ['MXN', 'USD'],
          characteristic_definitions: CHARACTERISTIC_DEFINITIONS,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!webhookResponse.ok) {
        throw new Error(`Webhook returned ${webhookResponse.status}`);
      }

      const result = await webhookResponse.json();

      // Merge with existing form data
      const existingFormData = (draft.form_data as Record<string, unknown>) || {};
      const updatedFormData = {
        ...existingFormData,
        title: result.title || existingFormData.title || '',
        description: result.description || existingFormData.description || '',
        is_for_sale: result.is_for_sale ?? existingFormData.is_for_sale ?? true,
        is_for_rent: result.is_for_rent ?? existingFormData.is_for_rent ?? false,
        price: result.is_for_sale ? result.price : null,
        currency: result.currency || existingFormData.currency || 'MXN',
        rent_price: result.is_for_rent ? result.rent_price : null,
        rent_currency: result.rent_currency || existingFormData.rent_currency || 'MXN',
        property_type: result.property_type || existingFormData.property_type || 'casa',
        custom_bonuses: result.custom_bonuses?.length ? result.custom_bonuses : existingFormData.custom_bonuses || [],
        characteristics: result.characteristics?.length ? result.characteristics : existingFormData.characteristics || [],
      };

      // Update draft with filled data
      const { error: updateError } = await supabaseAdmin
        .from('property_drafts')
        .update({
          form_data: updatedFormData,
          current_step: 'basic', // Move to next step
          ai_text: null, // Clear AI text after processing
          updated_at: new Date().toISOString(),
        })
        .eq('id', draft_id);

      if (updateError) {
        throw updateError;
      }

      // Deduct credits
      if (credits?.free_credits_remaining && credits.free_credits_remaining >= PREFILL_CREDIT_COST) {
        await supabaseAdmin
          .from('credits')
          .update({ free_credits_remaining: credits.free_credits_remaining - PREFILL_CREDIT_COST })
          .eq('user_id', user_id);
      } else {
        const freeToUse = credits?.free_credits_remaining || 0;
        const paidToUse = PREFILL_CREDIT_COST - freeToUse;
        await supabaseAdmin
          .from('credits')
          .update({ 
            free_credits_remaining: 0,
            balance: (credits?.balance || 0) - paidToUse 
          })
          .eq('user_id', user_id);
      }

      // Log credit transaction
      await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id,
          amount: -PREFILL_CREDIT_COST,
          type: 'ai_prefill',
          description: 'AI property prefill (background)',
          metadata: { draft_id },
        });

      return res.status(200).json({ success: true });

    } catch (webhookError) {
      clearTimeout(timeoutId);
      console.error('Webhook error:', webhookError);
      
      // Reset draft state on failure
      await supabaseAdmin
        .from('property_drafts')
        .update({ 
          ai_text: null,
          current_step: 'ai' 
        })
        .eq('id', draft_id);
      
      throw webhookError;
    }

  } catch (error) {
    console.error('Error processing draft prefill:', error);
    return res.status(500).json({ error: 'Failed to process AI prefill' });
  }
}
