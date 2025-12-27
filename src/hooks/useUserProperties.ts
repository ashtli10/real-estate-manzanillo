/**
 * useUserProperties Hook
 * Manages CRUD operations for user-owned properties
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import type { 
  UserProperty, 
  CreatePropertyInput, 
  UpdatePropertyInput,
  PropertyStatus
} from '../types/userProperty';

interface UseUserPropertiesReturn {
  properties: UserProperty[];
  loading: boolean;
  error: string | null;
  
  // CRUD operations
  fetchProperties: () => Promise<void>;
  createProperty: (input: CreatePropertyInput) => Promise<UserProperty | null>;
  updateProperty: (input: UpdatePropertyInput) => Promise<UserProperty | null>;
  deleteProperty: (id: string) => Promise<boolean>;
  
  // Status changes
  publishProperty: (id: string) => Promise<boolean>;
  pauseProperty: (id: string) => Promise<boolean>;
  archiveProperty: (id: string) => Promise<boolean>;
  
  // Single property fetch
  getProperty: (id: string) => Promise<UserProperty | null>;
}

// Transform database row to UserProperty type
function transformProperty(row: Record<string, unknown>): UserProperty {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: row.description as string | null,
    propertyType: row.property_type as UserProperty['propertyType'],
    listingType: row.listing_type as UserProperty['listingType'],
    address: row.address as string | null,
    neighborhood: row.neighborhood as string | null,
    city: row.city as string,
    state: row.state as string,
    postalCode: row.postal_code as string | null,
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    price: Number(row.price),
    currency: row.currency as string,
    pricePerSqm: row.price_per_sqm ? Number(row.price_per_sqm) : null,
    bedrooms: row.bedrooms as number | null,
    bathrooms: row.bathrooms ? Number(row.bathrooms) : null,
    halfBathrooms: row.half_bathrooms as number | null,
    squareMetersBuilt: row.square_meters_built ? Number(row.square_meters_built) : null,
    squareMetersLand: row.square_meters_land ? Number(row.square_meters_land) : null,
    parkingSpaces: row.parking_spaces as number | null,
    floors: row.floors as number | null,
    yearBuilt: row.year_built as number | null,
    ageYears: row.age_years as number | null,
    features: (row.features as string[]) || [],
    amenities: (row.amenities as string[]) || [],
    tags: (row.tags as string[]) || [],
    images: (row.images as string[]) || [],
    videos: (row.videos as string[]) || [],
    virtualTourUrl: row.virtual_tour_url as string | null,
    aiDescription: row.ai_description as string | null,
    aiPriceSuggestion: row.ai_price_suggestion ? Number(row.ai_price_suggestion) : null,
    status: row.status as PropertyStatus,
    isFeatured: row.is_featured as boolean,
    isVerified: row.is_verified as boolean,
    viewsCount: row.views_count as number,
    inquiriesCount: row.inquiries_count as number,
    slug: row.slug as string | null,
    metaTitle: row.meta_title as string | null,
    metaDescription: row.meta_description as string | null,
    publishedAt: row.published_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// Transform CreatePropertyInput to database format
function toDbFormat(input: CreatePropertyInput): Record<string, unknown> {
  return {
    title: input.title,
    description: input.description || null,
    property_type: input.propertyType,
    listing_type: input.listingType,
    address: input.address || null,
    neighborhood: input.neighborhood || null,
    city: input.city || 'Manzanillo',
    state: input.state || 'Colima',
    postal_code: input.postalCode || null,
    latitude: input.latitude || null,
    longitude: input.longitude || null,
    price: input.price,
    currency: input.currency || 'MXN',
    bedrooms: input.bedrooms || null,
    bathrooms: input.bathrooms || null,
    half_bathrooms: input.halfBathrooms || null,
    square_meters_built: input.squareMetersBuilt || null,
    square_meters_land: input.squareMetersLand || null,
    parking_spaces: input.parkingSpaces || null,
    floors: input.floors || null,
    year_built: input.yearBuilt || null,
    features: input.features || [],
    amenities: input.amenities || [],
    tags: input.tags || [],
    images: input.images || [],
    videos: input.videos || [],
    virtual_tour_url: input.virtualTourUrl || null,
    status: input.status || 'draft',
  };
}

export function useUserProperties(): UseUserPropertiesReturn {
  const { user } = useAuth();
  const [properties, setProperties] = useState<UserProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all properties for the current user
  const fetchProperties = useCallback(async () => {
    if (!user) {
      setProperties([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use type assertion to bypass strict Supabase type checking for new table
      const { data, error: fetchError } = await (supabase
        .from('properties') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setProperties(((data || []) as Record<string, unknown>[]).map(transformProperty));
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar propiedades');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load properties on mount and when user changes
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Create a new property
  const createProperty = useCallback(async (input: CreatePropertyInput): Promise<UserProperty | null> => {
    if (!user) {
      setError('Debes iniciar sesión para crear propiedades');
      return null;
    }

    setError(null);

    try {
      const dbData = {
        ...toDbFormat(input),
        user_id: user.id,
      };

      // Use type assertion to bypass strict Supabase type checking for new table
      const { data, error: insertError } = await (supabase
        .from('properties') as ReturnType<typeof supabase.from>)
        .insert(dbData)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const newProperty = transformProperty(data as Record<string, unknown>);
      setProperties(prev => [newProperty, ...prev]);
      return newProperty;
    } catch (err) {
      console.error('Error creating property:', err);
      setError(err instanceof Error ? err.message : 'Error al crear propiedad');
      return null;
    }
  }, [user]);

  // Update an existing property
  const updateProperty = useCallback(async (input: UpdatePropertyInput): Promise<UserProperty | null> => {
    if (!user) {
      setError('Debes iniciar sesión para actualizar propiedades');
      return null;
    }

    setError(null);

    try {
      const { id, ...rest } = input;
      const dbData = toDbFormat(rest as CreatePropertyInput);

      // Use type assertion to bypass strict Supabase type checking for new table
      const { data, error: updateError } = await (supabase
        .from('properties') as ReturnType<typeof supabase.from>)
        .update(dbData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      const updatedProperty = transformProperty(data as Record<string, unknown>);
      setProperties(prev => prev.map(p => p.id === id ? updatedProperty : p));
      return updatedProperty;
    } catch (err) {
      console.error('Error updating property:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar propiedad');
      return null;
    }
  }, [user]);

  // Delete a property
  const deleteProperty = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setError('Debes iniciar sesión para eliminar propiedades');
      return false;
    }

    setError(null);

    try {
      // Use type assertion to bypass strict Supabase type checking for new table
      const { error: deleteError } = await (supabase
        .from('properties') as ReturnType<typeof supabase.from>)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      setProperties(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting property:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar propiedad');
      return false;
    }
  }, [user]);

  // Change property status
  const changeStatus = useCallback(async (id: string, status: PropertyStatus, publishedAt?: string): Promise<boolean> => {
    if (!user) {
      setError('Debes iniciar sesión');
      return false;
    }

    setError(null);

    try {
      const updateData: Record<string, unknown> = { status };
      if (publishedAt !== undefined) {
        updateData.published_at = publishedAt;
      }

      // Use type assertion to bypass strict Supabase type checking for new table
      const { error: updateError } = await (supabase
        .from('properties') as ReturnType<typeof supabase.from>)
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      setProperties(prev => prev.map(p => 
        p.id === id 
          ? { ...p, status, publishedAt: publishedAt ?? p.publishedAt } 
          : p
      ));
      return true;
    } catch (err) {
      console.error('Error changing property status:', err);
      setError(err instanceof Error ? err.message : 'Error al cambiar estado');
      return false;
    }
  }, [user]);

  // Publish property (set to active)
  const publishProperty = useCallback(async (id: string): Promise<boolean> => {
    return changeStatus(id, 'active', new Date().toISOString());
  }, [changeStatus]);

  // Pause property
  const pauseProperty = useCallback(async (id: string): Promise<boolean> => {
    return changeStatus(id, 'paused');
  }, [changeStatus]);

  // Archive property
  const archiveProperty = useCallback(async (id: string): Promise<boolean> => {
    return changeStatus(id, 'archived');
  }, [changeStatus]);

  // Get a single property
  const getProperty = useCallback(async (id: string): Promise<UserProperty | null> => {
    try {
      // Use type assertion to bypass strict Supabase type checking for new table
      const { data, error: fetchError } = await (supabase
        .from('properties') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      return transformProperty(data as Record<string, unknown>);
    } catch (err) {
      console.error('Error fetching property:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar propiedad');
      return null;
    }
  }, []);

  return {
    properties,
    loading,
    error,
    fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
    publishProperty,
    pauseProperty,
    archiveProperty,
    getProperty,
  };
}
