/**
 * Stripe Service
 * Client-side service for Stripe operations
 */

import type { CreditPackageKey } from './stripe';
import { supabase } from '../integrations/supabase/client';

const API_BASE = '/api';

/**
 * Get the current user's access token
 */
async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Create a subscription checkout session and redirect to Stripe
 */
export async function createSubscriptionCheckout(): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const returnUrl = `${window.location.origin}/dashboard?tab=subscription`;

  const response = await fetch(`${API_BASE}/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: 'subscription',
      returnUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }

  const { url } = await response.json();
  
  if (url) {
    window.location.href = url;
  } else {
    throw new Error('No checkout URL returned');
  }
}

/**
 * Create a credit purchase checkout session and redirect to Stripe
 */
export async function createCreditCheckout(packageKey: CreditPackageKey): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const returnUrl = `${window.location.origin}/dashboard?tab=credits`;

  const response = await fetch(`${API_BASE}/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: 'credits',
      creditPackage: packageKey,
      returnUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }

  const { url } = await response.json();
  
  if (url) {
    window.location.href = url;
  } else {
    throw new Error('No checkout URL returned');
  }
}

/**
 * Open the Stripe customer portal for subscription management
 */
export async function openCustomerPortal(): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const returnUrl = `${window.location.origin}/dashboard?tab=subscription`;

  const response = await fetch(`${API_BASE}/stripe-portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ returnUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to open customer portal');
  }

  const { url } = await response.json();
  
  if (url) {
    window.location.href = url;
  } else {
    throw new Error('No portal URL returned');
  }
}

/**
 * Check if a checkout session was successful (call after redirect)
 */
export function checkCheckoutSuccess(): { success: boolean; canceled: boolean; credits?: number } {
  const params = new URLSearchParams(window.location.search);
  
  return {
    success: params.get('success') === 'true',
    canceled: params.get('canceled') === 'true',
    credits: params.get('credits') ? parseInt(params.get('credits')!, 10) : undefined,
  };
}

/**
 * Clear checkout params from URL
 */
export function clearCheckoutParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('success');
  url.searchParams.delete('canceled');
  url.searchParams.delete('session_id');
  url.searchParams.delete('credits');
  window.history.replaceState({}, '', url.toString());
}

// Re-export for convenience
export { getStripe, isStripeTestMode, SUBSCRIPTION_PRICE, CREDIT_PRICES } from './stripe';
