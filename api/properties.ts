/**
 * Serverless function to fetch properties from Supabase in real-time
 * This endpoint is designed for Vercel serverless functions
 */

import { createClient } from '@supabase/supabase-js';
import { 
  setSecureCORSHeaders,
  createErrorResponse,
  checkRateLimit,
  getClientIP
} from './lib/security';

// Environment variables for Supabase
// Note: In Vercel, use SUPABASE_URL and SUPABASE_ANON_KEY (not VITE_ prefixed)
// Falls back to VITE_ versions for backward compatibility
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

interface RequestHandler {
  (req: any, res: any): Promise<void>;
}

const handler: RequestHandler = async (req, res) => {
  // Set secure CORS headers
  // Note: For public read-only API, we allow more origins but still set proper headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Rate limiting: 100 requests per minute per IP (generous for public API)
  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(`properties:${clientIP}`, 100, 60000);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.ceil(rateLimit.resetIn / 1000).toString());
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse query parameters
    const { 
      featured, 
      limit, 
      propertyType, 
      minPrice, 
      maxPrice,
      nearBeach,
      slug
    } = req.query;

    let query = supabase
      .from('properties')
      .select('*')
      .eq('is_published', true);

    // Apply filters
    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    if (propertyType && propertyType !== 'all') {
      query = query.eq('property_type', propertyType);
    }

    if (minPrice) {
      const min = parseInt(minPrice);
      if (!isNaN(min) && min >= 0) {
        query = query.gte('price', min);
      }
    }

    if (maxPrice) {
      const max = parseInt(maxPrice);
      if (!isNaN(max) && max > 0) {
        query = query.lte('price', max);
      }
    }

    if (nearBeach === 'true') {
      query = query.eq('near_beach', true);
    }

    if (slug) {
      query = query.eq('slug', slug);
    } else {
      // Apply ordering and limit only when not fetching single property
      query = query.order('display_order', { ascending: true });

      if (limit) {
        const limitValue = parseInt(limit);
        if (!isNaN(limitValue) && limitValue > 0 && limitValue <= 100) {
          query = query.limit(limitValue);
        }
      }
    }

    const { data, error } = slug ? await query.maybeSingle() : await query;

    if (error) {
      console.error('Supabase error:', error);
      res.status(500).json({ error: 'Failed to fetch properties', details: error.message });
      return;
    }

    // Return properties with cache headers
    res.status(200).json({
      properties: data,
      count: Array.isArray(data) ? data.length : (data ? 1 : 0),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export default handler;
