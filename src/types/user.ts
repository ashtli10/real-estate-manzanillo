// User profile type
export interface Profile {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  username: string | null;
  company_name: string | null;
  bio: string | null;
  location: string | null;
  profile_image: string | null;
  cover_image: string | null;
  is_visible: boolean | null;
  onboarding_completed: boolean | null;
  stripe_customer_id: string | null;
  language_preference: string | null;
  email_verified: boolean | null;
}

export interface ProfileInsert {
  id: string;
  email: string;
  full_name?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  username?: string | null;
  company_name?: string | null;
  bio?: string | null;
  location?: string | null;
  profile_image?: string | null;
  cover_image?: string | null;
  is_visible?: boolean | null;
  onboarding_completed?: boolean | null;
  stripe_customer_id?: string | null;
  language_preference?: string | null;
  email_verified?: boolean | null;
}

export interface ProfileUpdate {
  full_name?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  username?: string | null;
  company_name?: string | null;
  bio?: string | null;
  location?: string | null;
  profile_image?: string | null;
  cover_image?: string | null;
  is_visible?: boolean | null;
  onboarding_completed?: boolean | null;
  stripe_customer_id?: string | null;
  language_preference?: string | null;
  email_verified?: boolean | null;
}

// Invitation token type
export interface InvitationToken {
  id: string;
  created_at: string;
  token: string;
  email: string | null;
  trial_days: number | null;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_by: string;
  notes: string | null;
}

export interface InvitationTokenInsert {
  email?: string | null;
  trial_days?: number;
  expires_at: string;
  notes?: string | null;
  created_by: string;
}

// Subscription type
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | 'incomplete' | 'incomplete_expired' | 'none';

export type PlanType = 'standard' | 'premium' | 'enterprise' | 'none';

export interface Subscription {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus | null;
  plan_type: PlanType | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
}

export interface SubscriptionInsert {
  user_id: string;
  status?: SubscriptionStatus | null;
  plan_type?: PlanType | null;
  trial_ends_at?: string | null;
}

// Credits type
export interface Credits {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  balance: number;
  free_credits_remaining: number;
  last_free_credit_reset: string | null;
}

// Credit transaction type
export type CreditTransactionType = 'purchased' | 'used' | 'free_monthly' | 'refund' | 'bonus';

export interface CreditTransaction {
  id: string;
  created_at: string;
  user_id: string;
  amount: number;
  type: CreditTransactionType;
  description: string | null;
  metadata: Record<string, unknown> | null;
}

// User roles
export type UserRole = 'admin' | 'agent';

export interface UserRoleRecord {
  id: string;
  created_at: string;
  user_id: string;
  role: UserRole;
}

// Onboarding steps
export type OnboardingStep = 'account' | 'personal' | 'business' | 'subscription' | 'complete';

export interface OnboardingData {
  // Step 1: Account (handled by Supabase auth)
  email: string;
  password: string;
  
  // Step 2: Personal Info
  full_name: string;
  phone_number: string;
  whatsapp_number: string;
  profile_image?: string;
  
  // Step 3: Business Info
  company_name?: string;
  username: string;
  bio?: string;
  location?: string;
  
  // Step 4: Subscription (handled separately)
  trial_days?: number;
}

// Validation helpers
export const USERNAME_REGEX = /^[a-z0-9_-]{3,30}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

export function formatUsernameError(username: string): string | null {
  if (!username) return 'El nombre de usuario es requerido';
  if (username.length < 3) return 'Mínimo 3 caracteres';
  if (username.length > 30) return 'Máximo 30 caracteres';
  if (!/^[a-z0-9_-]+$/.test(username)) return 'Solo letras minúsculas, números, guiones y guiones bajos';
  return null;
}
