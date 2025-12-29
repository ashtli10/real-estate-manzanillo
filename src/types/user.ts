// User profile type
export interface Profile {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  full_name: string;
  phone_number: string;
  whatsapp_number: string;
  username: string | null;
  company_name: string;
  bio: string;
  location: string;
  profile_image: string;
  cover_image: string;
  is_visible: boolean;
  onboarding_completed: boolean;
}

export interface ProfileInsert {
  id: string;
  email: string;
  full_name?: string;
  phone_number?: string;
  whatsapp_number?: string;
  username?: string | null;
  company_name?: string;
  bio?: string;
  location?: string;
  profile_image?: string;
  cover_image?: string;
  is_visible?: boolean;
  onboarding_completed?: boolean;
}

export interface ProfileUpdate {
  full_name?: string;
  phone_number?: string;
  whatsapp_number?: string;
  username?: string | null;
  company_name?: string;
  bio?: string;
  location?: string;
  profile_image?: string;
  cover_image?: string;
  is_visible?: boolean;
  onboarding_completed?: boolean;
}

// Invitation token type
export interface InvitationToken {
  id: string;
  created_at: string;
  token: string;
  email: string | null;
  trial_days: number;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_by: string | null;
  notes: string;
}

export interface InvitationTokenInsert {
  email?: string | null;
  trial_days?: number;
  expires_at: string;
  notes?: string;
}

// Subscription type
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

export interface Subscription {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
}

export interface SubscriptionInsert {
  user_id: string;
  status?: SubscriptionStatus;
  trial_starts_at?: string | null;
  trial_ends_at?: string | null;
}

// Credits type
export interface Credits {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  balance: number;
  last_monthly_refresh: string | null;
  monthly_credits_used: number;
}

// Credit transaction type
export type CreditTransactionType = 'subscription_refresh' | 'purchase' | 'usage' | 'refund' | 'admin_adjustment';

export interface CreditTransaction {
  id: string;
  created_at: string;
  user_id: string;
  amount: number;
  balance_after: number;
  transaction_type: CreditTransactionType;
  reference_id: string | null;
  description: string | null;
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
