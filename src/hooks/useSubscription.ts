import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { Subscription } from '../types/user';

export interface SubscriptionState {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  isActive: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  daysRemaining: number | null;
  trialDaysRemaining: number | null;
}

export interface UseSubscriptionReturn extends SubscriptionState {
  refresh: () => Promise<void>;
  createCheckoutSession: (trialDays?: number) => Promise<string | null>;
  createPortalSession: () => Promise<string | null>;
  canAccessDashboard: () => boolean;
  getStatusMessage: () => { status: string; message: string; color: string };
}

export function useSubscription(userId: string | undefined): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch subscription from database
  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setSubscription(data as Subscription | null);
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Failed to load subscription';
      console.error('Error fetching subscription:', err);
      setError(errMessage);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`subscription:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setSubscription(null);
          } else {
            setSubscription(payload.new as Subscription);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Calculate derived states
  const now = new Date();

  const isTrialing = subscription?.status === 'trialing' && 
    subscription.trial_ends_at && 
    new Date(subscription.trial_ends_at) > now;

  const isActive = subscription?.status === 'active' || isTrialing;

  const isPastDue = subscription?.status === 'past_due';

  const isCanceled = subscription?.status === 'canceled';

  // Calculate days remaining
  let daysRemaining: number | null = null;
  if (subscription?.current_period_end) {
    const endDate = new Date(subscription.current_period_end);
    daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // Calculate trial days remaining
  let trialDaysRemaining: number | null = null;
  if (subscription?.trial_ends_at && subscription.status === 'trialing') {
    const trialEnd = new Date(subscription.trial_ends_at);
    trialDaysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // Access control function
  const canAccessDashboard = useCallback((): boolean => {
    if (!subscription) return false;
    if (isActive) return true;
    if (isPastDue) return true; // Grace period
    return false;
  }, [subscription, isActive, isPastDue]);

  // Get status message for UI
  const getStatusMessage = useCallback((): { status: string; message: string; color: string } => {
    if (!subscription) {
      return { status: 'none', message: 'Sin suscripción', color: 'gray' };
    }

    if (isTrialing && trialDaysRemaining !== null) {
      return { 
        status: 'trialing', 
        message: `${trialDaysRemaining} días de prueba`, 
        color: 'blue' 
      };
    }

    if (subscription.status === 'active') {
      if (subscription.cancel_at_period_end) {
        return { 
          status: 'canceling', 
          message: `Cancela en ${daysRemaining} días`, 
          color: 'yellow' 
        };
      }
      return { status: 'active', message: 'Activa', color: 'green' };
    }

    if (isPastDue) {
      return { status: 'past_due', message: 'Pago pendiente', color: 'red' };
    }

    if (isCanceled) {
      return { status: 'canceled', message: 'Cancelada', color: 'gray' };
    }

    return { status: 'inactive', message: 'Inactiva', color: 'gray' };
  }, [subscription, isTrialing, trialDaysRemaining, daysRemaining, isPastDue, isCanceled]);

  // Create checkout session for subscription
  const createCheckoutSession = async (trialDays?: number): Promise<string | null> => {
    if (!userId) return null;

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subscription',
          userId,
          trialDays,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      return data.url;
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error creating checkout:', err);
      setError(errMessage);
      return null;
    }
  };

  // Create customer portal session
  const createPortalSession = async (): Promise<string | null> => {
    if (!userId) return null;

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'portal',
          userId,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      return data.url;
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error creating portal session:', err);
      setError(errMessage);
      return null;
    }
  };

  return {
    subscription,
    loading,
    error,
    isActive: Boolean(isActive),
    isTrialing: Boolean(isTrialing),
    isPastDue,
    isCanceled,
    daysRemaining,
    trialDaysRemaining,
    refresh: fetchSubscription,
    createCheckoutSession,
    createPortalSession,
    canAccessDashboard,
    getStatusMessage,
  };
}
