/**
 * Stripe Customer Portal Session API
 * Creates portal sessions for subscription management
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { 
  setSecureCORSHeaders, 
  validateReturnUrl, 
  createErrorResponse,
  checkRateLimit,
  getClientIP
} from './lib/security';

const STRIPE_MODE = process.env.STRIPE_MODE || 'test';
const STRIPE_SECRET_KEY = STRIPE_MODE === 'live' 
  ? process.env.STRIPE_LIVE_SECRET_KEY 
  : process.env.STRIPE_TEST_SECRET_KEY;

// Note: In Vercel, use SUPABASE_URL (not VITE_ prefixed)
// Falls back to VITE_ version for backward compatibility
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface RequestHandler {
  (req: any, res: any): Promise<void>;
}

const handler: RequestHandler = async (req, res) => {
  // Set secure CORS headers (restricts to allowed origins)
  setSecureCORSHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!STRIPE_SECRET_KEY) {
    res.status(500).json({ error: 'Stripe not configured' });
    return;
  }

  // Rate limiting: 5 requests per minute per IP
  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(`portal:${clientIP}`, 5, 60000);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.ceil(rateLimit.resetIn / 1000).toString());
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { returnUrl } = req.body;

    // Validate return URL to prevent open redirect
    const safeReturnUrl = validateReturnUrl(returnUrl, req.headers.origin);

    // Get the user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      res.status(400).json({ error: 'No subscription found' });
      return;
    }

    // Create a portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: safeReturnUrl,
    });

    res.status(200).json({ 
      url: session.url,
    });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json(createErrorResponse(error, 'Failed to create portal session'));
  }
};

export default handler;
