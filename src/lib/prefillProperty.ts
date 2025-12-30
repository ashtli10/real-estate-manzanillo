import type { CharacteristicDefinition, PropertyType, PropertyCharacteristic } from '../types/property';
import { supabase } from '../integrations/supabase/client';

export interface PrefillResponsePayload {
  title: string;
  description: string;
  price: number | null;
  currency: string | null;
  is_for_sale: boolean;
  is_for_rent: boolean;
  rent_price: number | null;
  rent_currency: string | null;
  property_type: PropertyType | null;
  custom_bonuses: string[];
  characteristics: PropertyCharacteristic[];
}

export interface PrefillErrorResponse {
  error: string;
  credits_required?: number;
  credits_available?: number;
}

// Use our secure Vercel API endpoint
const PREFILL_ENDPOINT = '/api/prefill-property';
const PREFILL_TIMEOUT_MS = 30000; // 30s to account for AI processing time

/**
 * Requests AI-powered property prefill through our secure backend.
 * Costs 2 credits per request.
 * 
 * @throws Error with user-friendly message if request fails
 */
export async function requestPropertyPrefill(
  rawText: string,
  characteristicDefinitions: CharacteristicDefinition[],
  propertyTypes: PropertyType[],
  currencies: string[],
  options?: { language?: 'es' | 'en'; defaultCurrency?: string }
): Promise<PrefillResponsePayload> {
  if (!rawText.trim()) {
    throw new Error('Proporciona texto para prefillar.');
  }

  // Get the current session token for authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Debes iniciar sesión para usar esta función.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PREFILL_TIMEOUT_MS);

  try {
    const response = await fetch(PREFILL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        raw_text: rawText,
        language: options?.language ?? 'es',
        default_currency: options?.defaultCurrency ?? 'MXN',
        property_types: propertyTypes,
        currencies,
        characteristic_definitions: characteristicDefinitions,
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as PrefillErrorResponse;
      
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Sesión expirada. Por favor, vuelve a iniciar sesión.');
      }
      if (response.status === 402) {
        // Insufficient credits
        throw new Error(errorData.error || 'Créditos insuficientes para esta operación.');
      }
      
      throw new Error(errorData.error || `Error ${response.status}: No se pudo procesar la solicitud.`);
    }

    const parsed = data as PrefillResponsePayload;

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Respuesta de prefill inválida');
    }

    return {
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      price: parsed.price ?? null,
      currency: parsed.currency ?? null,
      is_for_sale: Boolean(parsed.is_for_sale),
      is_for_rent: Boolean(parsed.is_for_rent),
      rent_price: parsed.rent_price ?? null,
      rent_currency: parsed.rent_currency ?? null,
      property_type: parsed.property_type as PropertyType | null,
      custom_bonuses: Array.isArray(parsed.custom_bonuses) ? parsed.custom_bonuses : [],
      characteristics: Array.isArray(parsed.characteristics) ? parsed.characteristics : [],
    };
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('La solicitud tardó demasiado. Intenta de nuevo.');
      }
      throw err;
    }
    throw new Error('Error desconocido al procesar la solicitud.');
  } finally {
    clearTimeout(timeout);
  }
}
