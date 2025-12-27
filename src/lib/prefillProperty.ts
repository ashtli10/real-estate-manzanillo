import type { CharacteristicDefinition, PropertyType, PropertyCharacteristic } from '../types/property';

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

const PREFILL_ENDPOINT = import.meta.env.VITE_PREFILL_PROPERTY_WEBHOOK_URL;
const PREFILL_AUTH = import.meta.env.VITE_PREFILL_PROPERTY_WEBHOOK_AUTH;
const PREFILL_TIMEOUT_MS = 20000;

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
  if (!PREFILL_ENDPOINT) {
    throw new Error('Falta configurar PREFILL webhook URL.');
  }
  if (!PREFILL_AUTH) {
    throw new Error('Falta configurar PREFILL auth.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PREFILL_TIMEOUT_MS);

  try {
    const response = await fetch(PREFILL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: PREFILL_AUTH,
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

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Prefill error ${response.status}: ${text.slice(0, 300)}`);
    }

    const text = await response.text();
    if (!text.trim()) {
      throw new Error('Prefill vacío: el webhook no devolvió contenido');
    }

    let parsed: PrefillResponsePayload;
    try {
      parsed = JSON.parse(text) as PrefillResponsePayload;
    } catch {
      throw new Error(`Respuesta de prefill no es JSON válido: ${text.slice(0, 300)}`);
    }

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
  } finally {
    clearTimeout(timeout);
  }
}
