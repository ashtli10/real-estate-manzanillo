-- Migration: Fix function search_path security warnings
-- Sets search_path = '' for all functions to prevent search_path injection attacks
-- This requires all table references to be fully qualified (e.g., public.credits)

-- Fix update_property_drafts_updated_at
ALTER FUNCTION public.update_property_drafts_updated_at() SET search_path = '';

-- Fix cleanup_old_property_drafts
ALTER FUNCTION public.cleanup_old_property_drafts() SET search_path = '';

-- Fix update_tasks_updated_at
ALTER FUNCTION public.update_tasks_updated_at() SET search_path = '';

-- Fix update_video_generation_jobs_updated_at
ALTER FUNCTION public.update_video_generation_jobs_updated_at() SET search_path = '';

-- Fix get_agent_dashboard_stats
ALTER FUNCTION public.get_agent_dashboard_stats(UUID) SET search_path = '';

-- Fix add_credits
ALTER FUNCTION public.add_credits(UUID, INTEGER, TEXT) SET search_path = '';

-- Fix deduct_credits
ALTER FUNCTION public.deduct_credits(UUID, INTEGER, TEXT) SET search_path = '';

-- Fix get_user_credits
ALTER FUNCTION public.get_user_credits(UUID) SET search_path = '';

-- Fix validate_invitation_token
ALTER FUNCTION public.validate_invitation_token(TEXT) SET search_path = '';

-- Fix update_profiles_updated_at
ALTER FUNCTION public.update_profiles_updated_at() SET search_path = '';

-- Fix update_subscriptions_updated_at
ALTER FUNCTION public.update_subscriptions_updated_at() SET search_path = '';

-- Fix use_invitation_token
ALTER FUNCTION public.use_invitation_token(TEXT, UUID) SET search_path = '';

-- Fix has_active_subscription
ALTER FUNCTION public.has_active_subscription(UUID) SET search_path = '';

-- Fix update_credits_updated_at
ALTER FUNCTION public.update_credits_updated_at() SET search_path = '';

-- Fix get_subscription_status
ALTER FUNCTION public.get_subscription_status(UUID) SET search_path = '';

-- Fix generate_property_slug
ALTER FUNCTION public.generate_property_slug() SET search_path = '';

-- Fix has_role
ALTER FUNCTION public.has_role(UUID, TEXT) SET search_path = '';

-- Fix update_properties_updated_at
ALTER FUNCTION public.update_properties_updated_at() SET search_path = '';

-- Fix the overly permissive RLS policy on audit_logs
-- The current policy allows any authenticated user to INSERT, which is too broad
-- We should restrict it to service_role only or add proper conditions

-- Drop the overly permissive policy
DROP POLICY IF EXISTS audit_logs_insert_system ON public.audit_logs;

-- Create a more restrictive policy that only allows inserts from service role
-- or from specific trigger contexts
CREATE POLICY audit_logs_insert_system ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow if the user_id matches the current user (for self-actions)
    -- or if called from a trigger/function context
    user_id = auth.uid()
    OR
    -- Allow service role (for system operations)
    auth.jwt() ->> 'role' = 'service_role'
  );
