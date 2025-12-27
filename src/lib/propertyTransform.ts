import type { Property, PropertyCharacteristic, CharacteristicType } from '../types/property';

// Helper to parse JSONB arrays
export function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Helper to parse characteristics array (supports both old and new formats)
export function parseCharacteristics(value: unknown): PropertyCharacteristic[] {
  const parseItem = (item: Record<string, unknown>): PropertyCharacteristic => {
    // Determine type - default to 'number' for backward compatibility
    const type: CharacteristicType = (item?.type as CharacteristicType) || 'number';
    
    // Parse value based on type
    let parsedValue: number | boolean;
    if (type === 'boolean') {
      parsedValue = Boolean(item?.value);
    } else {
      parsedValue = Number(item?.value) || 0;
    }
    
    return {
      id: String(item?.id || ''),
      key: String(item?.key || ''),
      label: String(item?.label || ''),
      type,
      value: parsedValue,
      description: item?.description ? String(item.description) : undefined,
    };
  };

  if (Array.isArray(value)) {
    return value.map((item) => parseItem(item as Record<string, unknown>));
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => parseItem(item as Record<string, unknown>));
      }
    } catch {
      return [];
    }
  }
  return [];
}

// Transform database row to Property type
export function transformProperty(row: Record<string, unknown>): Property {
  return {
    id: row.id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    title: row.title as string,
    slug: row.slug as string,
    description: row.description as string | null,
    price: row.price === null || row.price === undefined ? null : Number(row.price),
    currency: (row.currency as string) || 'MXN',
    is_for_sale: row.is_for_sale !== false,
    is_for_rent: row.is_for_rent === true,
    rent_price: row.rent_price === null || row.rent_price === undefined ? null : Number(row.rent_price),
    rent_currency: (row.rent_currency as string) || (row.currency as string) || 'MXN',
    location_city: row.location_city as string,
    location_state: row.location_state as string,
    location_neighborhood: row.location_neighborhood as string | null,
    location_address: row.location_address as string | null,
    location_lat: row.location_lat ? Number(row.location_lat) : null,
    location_lng: row.location_lng ? Number(row.location_lng) : null,
    property_type: row.property_type as Property['property_type'],
    custom_bonuses: parseJsonArray(row.custom_bonuses),
    images: parseJsonArray(row.images),
    videos: parseJsonArray(row.videos),
    is_featured: Boolean(row.is_featured),
    is_published: Boolean(row.is_published),
    display_order: Number(row.display_order) || 0,
    show_map: row.show_map !== false,
    near_beach: row.near_beach === true,
    characteristics: parseCharacteristics(row.characteristics),
  };
}
