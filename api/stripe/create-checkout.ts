import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const STRIPE_MODE = process.env.STRIPE_MODE || 'test';
const STRIPE_SECRET_KEY = STRIPE_MODE === 'live' 
  ? process.env.STRIPE_LIVE_SECRET_KEY 
  : process.env.STRIPE_TEST_SECRET_KEY;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

// Initialize Supabase with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Price IDs - LIVE mode (production)
const LIVE_SUBSCRIPTION_PRICE_ID = 'price_1Sj2fjCGlYYoSu1ta4UNOAUF'; // 199 MXN/month
const LIVE_CREDIT_PRICES: Record<string, string> = {
  '20': 'price_1Sj2ixCGlYYoSu1tTQy1qTpw',   // 20 MXN
  '50': 'price_1Sj2ixCGlYYoSu1tgRme2T4z',   // 50 MXN
  '100': 'price_1Sj2ixCGlYYoSu1t5H55JGaP',  // 100 MXN
  '650': 'price_1Sj2ixCGlYYoSu1tmPCi46qt',  // 500 MXN
  '1350': 'price_1Sj2ixCGlYYoSu1t7qNkVJog', // 1000 MXN
};

// Price IDs - TEST mode (development) - These need to be created in Stripe Test mode
// For now, we'll use environment variables to override, or fall back to live prices (will cause error in test mode)
const TEST_SUBSCRIPTION_PRICE_ID = process.env.STRIPE_TEST_SUBSCRIPTION_PRICE_ID || 'price_1SjnxzCGlYYoSu1ttRRmqUb3';
const TEST_CREDIT_PRICES: Record<string, string> = {
  '20': process.env.STRIPE_TEST_CREDIT_PRICE_20 || 'price_1SjnwZCGlYYoSu1t7S6RQvwB',
  '50': process.env.STRIPE_TEST_CREDIT_PRICE_50 || 'price_1SjnwkCGlYYoSu1tkmFLdT7l',
  '100': process.env.STRIPE_TEST_CREDIT_PRICE_100 || '',
  '650': process.env.STRIPE_TEST_CREDIT_PRICE_650 || '',
  '1350': process.env.STRIPE_TEST_CREDIT_PRICE_1350 || '',
};

// Select price IDs based on mode
const SUBSCRIPTION_PRICE_ID = STRIPE_MODE === 'live' 
  ? LIVE_SUBSCRIPTION_PRICE_ID 
  : (TEST_SUBSCRIPTION_PRICE_ID || LIVE_SUBSCRIPTION_PRICE_ID);

const CREDIT_PRICES = STRIPE_MODE === 'live' 
  ? LIVE_CREDIT_PRICES 
  : Object.fromEntries(
      Object.entries(LIVE_CREDIT_PRICES).map(([amount, livePrice]) => [
        amount, 
        TEST_CREDIT_PRICES[amount] || livePrice
      ])
    );

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, userId, trialDays, creditAmount, successUrl, cancelUrl } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get user profile to check for existing Stripe customer
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or create Stripe customer
    let customerId = profile.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: { user_id: userId },
      });
      customerId = customer.id;

      // Update profile with customer ID
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Get base URL from request headers (for Vercel deployments) or env var
    // Priority: 1) successUrl from request, 2) VITE_APP_URL env, 3) request origin, 4) localhost fallback
    const requestOrigin = req.headers.origin || req.headers.referer?.replace(/\/$/, '');
    const baseUrl = successUrl?.split('?')[0]?.replace(/\/dashboard.*$/, '') 
      || process.env.VITE_APP_URL 
      || requestOrigin 
      || 'http://localhost:5173';

    if (type === 'subscription') {
      // Create subscription checkout session
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: SUBSCRIPTION_PRICE_ID,
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/dashboard?checkout=success`,
        cancel_url: cancelUrl || `${baseUrl}/dashboard?checkout=canceled`,
        metadata: {
          user_id: userId,
          type: 'subscription',
        },
        subscription_data: {
          metadata: {
            user_id: userId,
          },
          ...(trialDays && trialDays > 0 ? { trial_period_days: trialDays } : {}),
        },
      };

      const session = await stripe.checkout.sessions.create(sessionParams);

      return res.status(200).json({ 
        url: session.url,
        sessionId: session.id,
      });
    } else if (type === 'credits') {
      // Create credit purchase checkout session
      const priceId = CREDIT_PRICES[String(creditAmount)];
      
      if (!priceId) {
        return res.status(400).json({ 
          error: 'Invalid credit amount',
          validAmounts: Object.keys(CREDIT_PRICES),
        });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/dashboard?checkout=credits-success`,
        cancel_url: cancelUrl || `${baseUrl}/dashboard?checkout=canceled`,
        metadata: {
          user_id: userId,
          type: 'credits',
          credit_amount: String(creditAmount),
        },
      });

      return res.status(200).json({
        url: session.url,
        sessionId: session.id,
      });
    } else if (type === 'portal') {
      // Create customer portal session for managing subscription
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${baseUrl}/dashboard`,
      });

      return res.status(200).json({
        url: portalSession.url,
      });
    } else {
      return res.status(400).json({ 
        error: 'Invalid type. Use "subscription", "credits", or "portal"' 
      });
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Checkout error:', error);
    return res.status(500).json({ 
      error: errMessage || 'Internal server error' 
    });
  }
}
