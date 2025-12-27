import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { Property, PropertyInsert, PropertyUpdate } from '../types/property';
import { transformProperty } from '../lib/propertyTransform';

// Hook for fetching published properties
export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('is_published', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setProperties((data || []).map(transformProperty));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch properties'));
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, []);

  return { properties, loading, error };
}

// Hook for fetching featured properties
export function useFeaturedProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('is_published', true)
          .eq('is_featured', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setProperties((data || []).map(transformProperty));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch featured properties'));
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, []);

  return { properties, loading, error };
}

// Hook for fetching a single property by slug
export function useProperty(slug: string) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    async function fetchProperty() {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .maybeSingle();

        if (error) throw error;
        setProperty(data ? transformProperty(data) : null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch property'));
      } finally {
        setLoading(false);
      }
    }

    fetchProperty();
  }, [slug]);

  return { property, loading, error };
}

// Hook for admin property management
export function useAdminProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setProperties((data || []).map(transformProperty));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch properties'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const createProperty = async (property: PropertyInsert) => {
    // Convert to database format
    const dbData = {
      ...property,
      characteristics: JSON.stringify(property.characteristics),
    };
    
    const { data, error } = await supabase
      .from('properties')
      .insert([dbData])
      .select()
      .single();

    if (error) throw error;
    await fetchProperties();
    return transformProperty(data);
  };

  const updateProperty = async (id: string, updates: PropertyUpdate) => {
    // Convert to database format if characteristics is present
    const dbData = updates.characteristics 
      ? { ...updates, characteristics: JSON.stringify(updates.characteristics) }
      : updates;

    const { data, error } = await supabase
      .from('properties')
      .update(dbData as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchProperties();
    return transformProperty(data);
  };

  const deleteProperty = async (id: string) => {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchProperties();
  };

  const updateDisplayOrder = async (id: string, displayOrder: number) => {
    const { error } = await supabase
      .from('properties')
      .update({ display_order: displayOrder })
      .eq('id', id);

    if (error) throw error;
  };

  return {
    properties,
    loading,
    error,
    fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
    updateDisplayOrder,
  };
}
