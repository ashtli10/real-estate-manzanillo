import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { Credits } from '../types/user';

export interface CreditsState {
  credits: Credits | null;
  loading: boolean;
  error: string | null;
  totalCredits: number;
  freeCredits: number;
  paidCredits: number;
}

export interface UseCreditsReturn extends CreditsState {
  refresh: () => Promise<void>;
  purchaseCredits: (amount: number) => Promise<string | null>;
  hasEnoughCredits: (amount: number) => boolean;
}

// Credit pack options matching Stripe products
export const CREDIT_PACKS = [
  { amount: 20, price: 20, priceFormatted: '$20 MXN' },
  { amount: 50, price: 50, priceFormatted: '$50 MXN' },
  { amount: 100, price: 100, priceFormatted: '$100 MXN' },
  { amount: 500, price: 500, priceFormatted: '$500 MXN' },
  { amount: 1000, price: 1000, priceFormatted: '$1,000 MXN' },
] as const;

export function useCredits(userId: string | undefined): UseCreditsReturn {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch credits from database
  const fetchCredits = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setCredits(data as Credits | null);
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Failed to load credits';
      console.error('Error fetching credits:', err);
      setError(errMessage);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`credits:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credits',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setCredits(null);
          } else {
            setCredits(payload.new as Credits);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Calculate derived values
  const freeCredits = credits?.free_credits_remaining ?? 0;
  const paidCredits = credits?.balance ?? 0;
  const totalCredits = freeCredits + paidCredits;

  // Check if user has enough credits
  const hasEnoughCredits = useCallback((amount: number): boolean => {
    return totalCredits >= amount;
  }, [totalCredits]);

  // Purchase credits
  const purchaseCredits = async (amount: number): Promise<string | null> => {
    if (!userId) return null;

    // Validate amount
    const validPack = CREDIT_PACKS.find(pack => pack.amount === amount);
    if (!validPack) {
      setError('Invalid credit amount');
      return null;
    }

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'credits',
          userId,
          creditAmount: amount,
          successUrl: `${window.location.origin}/dashboard?checkout=credits-success`,
          cancelUrl: `${window.location.origin}/dashboard?checkout=canceled`,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      return data.url;
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error purchasing credits:', err);
      setError(errMessage);
      return null;
    }
  };

  return {
    credits,
    loading,
    error,
    totalCredits,
    freeCredits,
    paidCredits,
    refresh: fetchCredits,
    purchaseCredits,
    hasEnoughCredits,
  };
}
