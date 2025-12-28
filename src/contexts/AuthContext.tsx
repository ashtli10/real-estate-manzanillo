/**
 * Enhanced Authentication Context
 * Provides auth state, subscription status, and credits for the marketplace
 * Implements secure session management with automatic refresh
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import type { 
  UserProfile, 
  UserSubscription, 
  UserCredits, 
  AuthState,
  SubscriptionStatus,
  PlanType
} from '../types/auth';

// =============================================================================
// TYPES
// =============================================================================

interface AuthContextType {
  // Core auth state
  user: User | null;
  session: Session | null;
  loading: boolean;
  
  // Extended state
  profile: UserProfile | null;
  subscription: UserSubscription | null;
  credits: UserCredits | null;
  isAdmin: boolean;
  hasActiveSubscription: boolean;
  
  // Auth actions
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, invitationToken: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  
  // Profile actions
  updateProfile: (data: { fullName?: string; phone?: string; companyName?: string; languagePreference?: 'es' | 'en' }) => Promise<boolean>;
  
  // Data refresh
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  // Core auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Extended state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Computed values
  const hasActiveSubscription = subscription?.isActive ?? false;

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        phone: data.phone,
        companyName: data.company_name,
        avatarUrl: data.avatar_url,
        languagePreference: data.language_preference as 'es' | 'en',
        emailVerified: data.email_verified,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  const fetchSubscription = useCallback(async (userId: string): Promise<UserSubscription | null> => {
    try {
      const { data, error } = await supabase
        .rpc('get_subscription_status', { check_user_id: userId });

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return {
          status: 'none' as SubscriptionStatus,
          planType: 'none' as PlanType,
          trialEndsAt: null,
          currentPeriodEnd: null,
          isActive: false,
          stripeSubscriptionId: null,
          stripeCustomerId: null,
        };
      }

      const sub = data[0];
      return {
        status: sub.status as SubscriptionStatus,
        planType: sub.plan_type as PlanType,
        trialEndsAt: sub.trial_ends_at,
        currentPeriodEnd: sub.current_period_end,
        isActive: sub.is_active,
        stripeSubscriptionId: sub.stripe_subscription_id || null,
        stripeCustomerId: sub.stripe_customer_id || null,
      };
    } catch (err) {
      console.error('Error fetching subscription:', err);
      return null;
    }
  }, []);

  const fetchCredits = useCallback(async (userId: string): Promise<UserCredits | null> => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_credits', { check_user_id: userId });

      if (error) {
        console.error('Error fetching credits:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return {
          balance: 0,
          freeCreditsRemaining: 0,
          lastReset: null,
        };
      }

      const cred = data[0];
      return {
        balance: cred.balance,
        freeCreditsRemaining: cred.free_credits_remaining,
        lastReset: cred.last_reset,
      };
    } catch (err) {
      console.error('Error fetching credits:', err);
      return null;
    }
  }, []);

  const checkAdminRole = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error('Error checking admin role:', err);
      return false;
    }
  }, []);

  // =============================================================================
  // REFRESH FUNCTIONS
  // =============================================================================

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const newProfile = await fetchProfile(user.id);
    setProfile(newProfile);
  }, [user, fetchProfile]);

  const refreshSubscription = useCallback(async () => {
    if (!user) return;
    const newSub = await fetchSubscription(user.id);
    setSubscription(newSub);
  }, [user, fetchSubscription]);

  const refreshCredits = useCallback(async () => {
    if (!user) return;
    const newCredits = await fetchCredits(user.id);
    setCredits(newCredits);
  }, [user, fetchCredits]);

  // =============================================================================
  // LOAD ALL USER DATA
  // =============================================================================

  const loadUserData = useCallback(async (userId: string) => {
    // Fetch all user data in parallel for performance
    const [profileData, subscriptionData, creditsData, adminStatus] = await Promise.all([
      fetchProfile(userId),
      fetchSubscription(userId),
      fetchCredits(userId),
      checkAdminRole(userId),
    ]);

    setProfile(profileData);
    setSubscription(subscriptionData);
    setCredits(creditsData);
    setIsAdmin(adminStatus);
  }, [fetchProfile, fetchSubscription, fetchCredits, checkAdminRole]);

  const clearUserData = useCallback(() => {
    setProfile(null);
    setSubscription(null);
    setCredits(null);
    setIsAdmin(false);
  }, []);

  // =============================================================================
  // AUTH LISTENERS
  // =============================================================================

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Load user data on auth state change
          // Use setTimeout to avoid Supabase client deadlock
          setTimeout(() => {
            loadUserData(newSession.user.id).finally(() => setLoading(false));
          }, 0);
        } else {
          clearUserData();
          setLoading(false);
        }
      }
    );

    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        loadUserData(existingSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => authSubscription.unsubscribe();
  }, [loadUserData, clearUserData]);

  // =============================================================================
  // AUTH ACTIONS
  // =============================================================================

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, invitationToken: string) => {
    try {
      // First validate the invitation token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('validate_invitation_token', { token_value: invitationToken });

      if (tokenError) {
        return { error: new Error('Error al validar el token de invitación') };
      }

      if (!tokenData || tokenData.length === 0 || !tokenData[0].valid) {
        return { error: new Error('El token de invitación no es válido o ha expirado') };
      }

      const trialDays = tokenData[0].trial_days;

      // Sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        return { error: signUpError };
      }

      if (!signUpData.user) {
        return { error: new Error('Error al crear la cuenta') };
      }

      // Mark the token as used
      await supabase.rpc('use_invitation_token', {
        token_value: invitationToken,
        consuming_user_id: signUpData.user.id,
      });

      // Create subscription with trial
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: signUpData.user.id,
          status: 'trialing',
          trial_ends_at: trialEndsAt.toISOString(),
        });

      if (subError) {
        console.error('Error creating subscription:', subError);
        // Don't fail signup for this - they can still use the app
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        setUser(null);
        setSession(null);
        clearUserData();
      }
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const updateProfile = async (data: { 
    fullName?: string; 
    phone?: string; 
    companyName?: string; 
    languagePreference?: 'es' | 'en' 
  }): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          phone: data.phone,
          company_name: data.companyName,
          language_preference: data.languagePreference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return false;
      }

      // Refresh the profile to get updated data
      await refreshProfile();
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      return false;
    }
  };

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const value: AuthContextType = {
    user,
    session,
    loading,
    profile,
    subscription,
    credits,
    isAdmin,
    hasActiveSubscription,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
    refreshSubscription,
    refreshCredits,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Convenience hook for checking auth state
 * Returns a simplified object for route protection
 */
export function useAuthState(): AuthState {
  const { user, isAdmin, hasActiveSubscription, loading } = useAuth();
  
  return {
    isAuthenticated: !!user,
    isAdmin,
    hasActiveSubscription,
    isLoading: loading,
  };
}
