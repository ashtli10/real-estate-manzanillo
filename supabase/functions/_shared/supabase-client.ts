/**
 * Shared Supabase client utilities for Edge Functions
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Get environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Create a Supabase client with the user's auth context
 * This respects RLS policies based on the user's JWT
 */
export function createUserClient(authHeader: string | null) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase admin client that bypasses RLS
 * Only use for operations that need elevated privileges
 */
export function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Verify user from Authorization header
 * Returns user object or null if invalid
 */
export async function getUserFromAuth(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const supabase = createUserClient(authHeader);
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.error('Auth error:', error);
    return null;
  }
  
  return user;
}
