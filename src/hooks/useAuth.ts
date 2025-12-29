import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import type { Profile, Subscription } from '../types/user';

export type UserRole = 'admin' | 'agent' | null;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Check roles with setTimeout to avoid deadlock
        if (newSession?.user) {
          setTimeout(() => {
            loadUserData(newSession.user.id);
          }, 0);
        } else {
          resetUserState();
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }: { data: { session: Session | null } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        loadUserData(existingSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => authSubscription.unsubscribe();
  }, []);

  const resetUserState = () => {
    setProfile(null);
    setSubscription(null);
    setRole(null);
    setIsAdmin(false);
    setIsAgent(false);
    setLoading(false);
  };

  const loadUserData = async (userId: string) => {
    try {
      // Load role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (!roleError && roleData) {
        const userRole = roleData.role as UserRole;
        setRole(userRole);
        setIsAdmin(userRole === 'admin');
        setIsAgent(userRole === 'agent');
      } else {
        setRole(null);
        setIsAdmin(false);
        setIsAgent(false);
      }

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Load subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (subData) {
        setSubscription(subData as Subscription);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      resetUserState();
    }
    return { error };
  };

  // Check if user has active subscription
  const hasActiveSubscription = (): boolean => {
    if (!subscription) return false;
    
    if (subscription.status === 'active') return true;
    
    if (subscription.status === 'trialing' && subscription.trial_ends_at) {
      return new Date(subscription.trial_ends_at) > new Date();
    }
    
    // Past due still allows access (grace period)
    if (subscription.status === 'past_due') return true;
    
    return false;
  };

  return {
    user,
    session,
    profile,
    subscription,
    role,
    isAdmin,
    isAgent,
    loading,
    signIn,
    signUp,
    signOut,
    hasActiveSubscription,
  };
}
