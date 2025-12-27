/**
 * Stripe Configuration & Client
 * Environment-based test/live mode toggle
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

// Environment-based Stripe configuration
const STRIPE_MODE = import.meta.env.VITE_STRIPE_MODE || 'test';
const STRIPE_TEST_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || '';
const STRIPE_LIVE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_LIVE_PUBLISHABLE_KEY || '';

// Get the appropriate Stripe publishable key
export function getStripePublishableKey(): string {
  return STRIPE_MODE === 'live' 
    ? STRIPE_LIVE_PUBLISHABLE_KEY 
    : STRIPE_TEST_PUBLISHABLE_KEY;
}

// Singleton Stripe instance
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = getStripePublishableKey();
    if (!key) {
      console.warn('Stripe publishable key not configured');
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = loadStripe(key);
    }
  }
  return stripePromise;
}

// Check if Stripe is in test mode
export function isStripeTestMode(): boolean {
  return STRIPE_MODE !== 'live';
}

// Subscription pricing (in MXN centavos)
export const SUBSCRIPTION_PRICE = {
  amount: 19900, // 199 MXN
  currency: 'mxn',
  interval: 'month' as const,
  displayAmount: '199',
  displayCurrency: 'MXN',
  priceId: 'price_1Sj2fjCGlYYoSu1ta4UNOAUF', // Stripe price ID
};

// Credit pricing (1 MXN = 1 credit)
export const CREDIT_PRICES = {
  credits_20: { 
    credits: 20, 
    amount: 2000, 
    displayAmount: '20',
    priceId: 'price_1Sj2ixCGlYYoSu1tTQy1qTpw',
  },
  credits_50: { 
    credits: 50, 
    amount: 5000, 
    displayAmount: '50',
    priceId: 'price_1Sj2ixCGlYYoSu1tgRme2T4z',
  },
  credits_100: { 
    credits: 100, 
    amount: 10000, 
    displayAmount: '100',
    priceId: 'price_1Sj2ixCGlYYoSu1t5H55JGaP',
    popular: true,
  },
  credits_500: { 
    credits: 500, 
    amount: 50000, 
    displayAmount: '500',
    priceId: 'price_1Sj2ixCGlYYoSu1tmPCi46qt',
  },
  credits_1000: { 
    credits: 1000, 
    amount: 100000, 
    displayAmount: '1,000',
    priceId: 'price_1Sj2ixCGlYYoSu1t7qNkVJog',
    bestValue: true,
  },
};

// Credit package type
export type CreditPackageKey = keyof typeof CREDIT_PRICES;

// Get credit package details
export function getCreditPackage(key: CreditPackageKey) {
  return CREDIT_PRICES[key];
}
