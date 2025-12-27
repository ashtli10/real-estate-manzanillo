/**
 * Authentication and Authorization Types
 * Defines all types for the marketplace auth system
 */

export type UserRole = 'admin' | 'user';

export type SubscriptionStatus = 
  | 'trialing' 
  | 'active' 
  | 'past_due' 
  | 'canceled' 
  | 'paused' 
  | 'incomplete' 
  | 'incomplete_expired'
  | 'none';

export type PlanType = 'standard' | 'premium' | 'enterprise' | 'none';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  companyName: string | null;
  avatarUrl: string | null;
  languagePreference: 'es' | 'en';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  status: SubscriptionStatus;
  planType: PlanType;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  isActive: boolean;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
}

export interface UserCredits {
  balance: number;
  freeCreditsRemaining: number;
  lastReset: string | null;
}

export interface InvitationToken {
  id: string;
  token: string;
  email: string | null;
  createdBy: string;
  expiresAt: string;
  usedAt: string | null;
  usedBy: string | null;
  trialDays: number;
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasActiveSubscription: boolean;
  isLoading: boolean;
}

/**
 * Protected route configuration
 */
export type RouteProtection = 
  | 'public'           // Anyone can access
  | 'auth'             // Must be logged in
  | 'subscribed'       // Must have active subscription
  | 'admin';           // Must be admin

export interface RouteConfig {
  path: string;
  protection: RouteProtection;
  redirectTo?: string;
}

/**
 * Invitation validation result from the database function
 */
export interface InvitationValidation {
  valid: boolean;
  email: string | null;
  trial_days: number;
}
