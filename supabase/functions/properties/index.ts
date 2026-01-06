/**
 * Properties Edge Function
 * 
 * Fetches properties from Supabase with filtering options.
 * This is a public endpoint that doesn't require authentication.
 * 
 * Query Parameters:
 * - featured: 'true' to filter for featured properties
 * - propertyType: filter by property type (e.g., 'casa', 'departamento')
 * - minPrice: minimum price filter
 * - maxPrice: maximum price filter
 * - slug: fetch a single property by slug
 * - limit: max number of results (1-100, default 50)
 * - city: filter by city
 * - listingType: 'sale' | 'rent' | 'both'
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Build query with profile join for agent info
    let query = supabase
      .from('properties')
      .select(`
        *,
        profiles!inner(username, full_name, profile_image, whatsapp_number)
      `)
      .eq('status', 'active');

    // Apply filters
    if (params.featured === 'true') {
      query = query.eq('is_featured', true);
    }

    if (params.propertyType && params.propertyType !== 'all') {
      query = query.eq('property_type', params.propertyType);
    }

    if (params.minPrice) {
      const min = parseInt(params.minPrice);
      if (!isNaN(min) && min >= 0) {
        query = query.gte('price', min);
      }
    }

    if (params.maxPrice) {
      const max = parseInt(params.maxPrice);
      if (!isNaN(max) && max > 0) {
        query = query.lte('price', max);
      }
    }

    if (params.city) {
      query = query.eq('location_city', params.city);
    }

    if (params.listingType === 'sale') {
      query = query.eq('is_for_sale', true);
    } else if (params.listingType === 'rent') {
      query = query.eq('is_for_rent', true);
    }

    // Single property by slug
    if (params.slug) {
      query = query.eq('slug', params.slug);
      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Supabase error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch property', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          properties: data,
          count: data ? 1 : 0,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
          },
        }
      );
    }

    // Multiple properties - apply ordering and limit
    query = query.order('display_order', { ascending: true });

    if (params.limit) {
      const limitValue = parseInt(params.limit);
      if (!isNaN(limitValue) && limitValue > 0 && limitValue <= 100) {
        query = query.limit(limitValue);
      }
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch properties', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        properties: data,
        count: data?.length ?? 0,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
