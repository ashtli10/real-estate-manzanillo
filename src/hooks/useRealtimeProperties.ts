/**
 * Custom hook for real-time property updates using Supabase subscriptions
 */

import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { Property } from '../types/property';
import { transformProperty } from '../lib/propertyTransform';

interface UseRealtimePropertiesOptions {
  featured?: boolean;
  limit?: number;
  enabled?: boolean;
}

export function useRealtimeProperties(options: UseRealtimePropertiesOptions = {}) {
  const { featured = false, limit, enabled = true } = options;
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const loadProperties = async () => {
      try {
        let query = supabase
          .from('properties')
          .select('*')
          .eq('status', 'active');

        if (featured) {
          query = query.eq('is_featured', true);
        }

        query = query.order('display_order', { ascending: true });

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;
        
        if (mounted) {
          setProperties((data || []).map(transformProperty));
          setError(null);
        }
      } catch (err) {
        console.error('Error loading properties:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProperties();

    // Set up real-time subscription
    const channel = supabase
      .channel('properties-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties',
          filter: 'status=eq.active'
        },
        (payload) => {
          console.log('Real-time property change:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newProperty = transformProperty(payload.new as any);
            
            setProperties((current) => {
              // Check if property already exists
              const existingIndex = current.findIndex(p => p.id === newProperty.id);
              
              if (existingIndex !== -1) {
                // Update existing property
                const updated = [...current];
                updated[existingIndex] = newProperty;
                return updated.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
              } else {
                // Add new property
                return [...current, newProperty].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
              }
            });
          } else if (payload.eventType === 'DELETE') {
            setProperties((current) => current.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [featured, limit, enabled]);

  return { properties, loading, error, refetch: () => setLoading(true) };
}

/**
 * Custom hook for a single property with real-time updates
 */
export function useRealtimeProperty(slug: string, enabled: boolean = true) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !slug) return;

    let mounted = true;

    const loadProperty = async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('properties')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'active')
          .maybeSingle();

        if (queryError) throw queryError;
        
        if (mounted) {
          setProperty(data ? transformProperty(data) : null);
          setError(null);
        }
      } catch (err) {
        console.error('Error loading property:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProperty();

    // Set up real-time subscription for this specific property
    const channel = supabase
      .channel(`property-${slug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties',
          filter: `slug=eq.${slug}`
        },
        (payload) => {
          console.log('Real-time property update:', payload);
          
          if (payload.eventType === 'UPDATE') {
            setProperty(transformProperty(payload.new as any));
          } else if (payload.eventType === 'DELETE') {
            setProperty(null);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [slug, enabled]);

  return { property, loading, error };
}
