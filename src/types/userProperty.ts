/**
 * User Property Types
 * Types for user-owned properties in the marketplace
 */

export type PropertyListingType = 'venta' | 'renta' | 'traspaso';
export type PropertyTypeSimple = 'casa' | 'departamento' | 'terreno' | 'local' | 'oficina' | 'bodega' | 'otro';
export type PropertyStatus = 'draft' | 'pending' | 'active' | 'sold' | 'rented' | 'paused' | 'archived';

export interface UserProperty {
  id: string;
  userId: string;
  
  // Basic info
  title: string;
  description: string | null;
  propertyType: PropertyTypeSimple;
  listingType: PropertyListingType;
  
  // Location
  address: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  
  // Pricing
  price: number;
  currency: string;
  pricePerSqm: number | null;
  
  // Property details
  bedrooms: number | null;
  bathrooms: number | null;
  halfBathrooms: number | null;
  squareMetersBuilt: number | null;
  squareMetersLand: number | null;
  parkingSpaces: number | null;
  floors: number | null;
  yearBuilt: number | null;
  ageYears: number | null;
  
  // Features
  features: string[];
  amenities: string[];
  tags: string[];
  
  // Media
  images: string[];
  videos: string[];
  virtualTourUrl: string | null;
  
  // AI-generated content
  aiDescription: string | null;
  aiPriceSuggestion: number | null;
  
  // Status
  status: PropertyStatus;
  isFeatured: boolean;
  isVerified: boolean;
  
  // Analytics
  viewsCount: number;
  inquiriesCount: number;
  
  // SEO
  slug: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  
  // Timestamps
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePropertyInput {
  title: string;
  description?: string;
  propertyType: PropertyTypeSimple;
  listingType: PropertyListingType;
  
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  
  price: number;
  currency?: string;
  
  bedrooms?: number;
  bathrooms?: number;
  halfBathrooms?: number;
  squareMetersBuilt?: number;
  squareMetersLand?: number;
  parkingSpaces?: number;
  floors?: number;
  yearBuilt?: number;
  
  features?: string[];
  amenities?: string[];
  tags?: string[];
  
  images?: string[];
  videos?: string[];
  virtualTourUrl?: string;
  
  status?: PropertyStatus;
}

export interface UpdatePropertyInput extends Partial<CreatePropertyInput> {
  id: string;
}

// Status labels and colors for UI
export const PROPERTY_STATUS_CONFIG: Record<PropertyStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Borrador', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  pending: { label: 'En revisión', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  active: { label: 'Activo', color: 'text-green-600', bgColor: 'bg-green-100' },
  sold: { label: 'Vendido', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  rented: { label: 'Rentado', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  paused: { label: 'Pausado', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  archived: { label: 'Archivado', color: 'text-slate-600', bgColor: 'bg-slate-100' },
};

export const PROPERTY_TYPE_LABELS: Record<PropertyTypeSimple, string> = {
  casa: 'Casa',
  departamento: 'Departamento',
  terreno: 'Terreno',
  local: 'Local comercial',
  oficina: 'Oficina',
  bodega: 'Bodega',
  otro: 'Otro',
};

export const LISTING_TYPE_LABELS: Record<PropertyListingType, string> = {
  venta: 'Venta',
  renta: 'Renta',
  traspaso: 'Traspaso',
};
