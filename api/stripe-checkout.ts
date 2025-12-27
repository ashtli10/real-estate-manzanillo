/**
 * Stripe Checkout Session API
 * Creates checkout sessions for subscriptions and credit purchases
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

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Subscription price ID from Stripe
const SUBSCRIPTION_PRICE_ID = 'price_1Sj2fjCGlYYoSu1ta4UNOAUF';

// Credit packages (1 MXN = 1 credit)
const CREDIT_PACKAGES = {
  credits_20: { credits: 20, priceId: 'price_1Sj2ixCGlYYoSu1tTQy1qTpw' },
  credits_50: { credits: 50, priceId: 'price_1Sj2ixCGlYYoSu1tgRme2T4z' },
  credits_100: { credits: 100, priceId: 'price_1Sj2ixCGlYYoSu1t5H55JGaP' },
  credits_500: { credits: 500, priceId: 'price_1Sj2ixCGlYYoSu1tmPCi46qt' },
  credits_1000: { credits: 1000, priceId: 'price_1Sj2ixCGlYYoSu1t7qNkVJog' },
};

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

  // Rate limiting: 10 requests per minute per IP
  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(`checkout:${clientIP}`, 10, 60000);
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

    const { type, creditPackage, returnUrl } = req.body;

    // Validate return URL to prevent open redirect
    const safeReturnUrl = validateReturnUrl(returnUrl, req.headers.origin);

    // Get or create Stripe customer
    let customerId: string;
    
    // Check if user already has a Stripe customer ID in their profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Store customer ID in profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    let session: Stripe.Checkout.Session;

    if (type === 'subscription') {
      // Create subscription checkout session using pre-created price
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: SUBSCRIPTION_PRICE_ID,
            quantity: 1,
          },
        ],
        success_url: `${safeReturnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${safeReturnUrl}?canceled=true`,
        metadata: {
          supabase_user_id: user.id,
          type: 'subscription',
        },
      });
    } else if (type === 'credits' && creditPackage) {
      const packageInfo = CREDIT_PACKAGES[creditPackage as keyof typeof CREDIT_PACKAGES];
      if (!packageInfo) {
        res.status(400).json({ error: 'Invalid credit package' });
        return;
      }

      // Create one-time payment checkout session for credits using pre-created price
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price: packageInfo.priceId,
            quantity: 1,
          },
        ],
        success_url: `${safeReturnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true&credits=${packageInfo.credits}`,
        cancel_url: `${safeReturnUrl}?canceled=true`,
        metadata: {
          supabase_user_id: user.id,
          type: 'credits',
          credits: packageInfo.credits.toString(),
        },
      });
    } else {
      res.status(400).json({ error: 'Invalid checkout type' });
      return;
    }

    res.status(200).json({ 
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json(createErrorResponse(error, 'Failed to create checkout session'));
  }
};

export default handler;
