-- Migration: Fix Infinite Recursion in user_roles RLS Policies
-- Date: 2026-01-06
-- Problem: user_roles policies reference user_roles table to check admin status,
--          causing infinite recursion on any query to user_roles.
-- Solution: 
--   1. Create a SECURITY DEFINER helper function that bypasses RLS
--   2. Update user_roles policies to use simple checks (no self-reference)
--   3. Update other policies that use has_role() to use direct admin check

-- ============================================================================
-- STEP 1: Create a safe admin check function that bypasses RLS
-- ============================================================================

-- This function uses SECURITY DEFINER to bypass RLS and check if user is admin
-- It's safe because it only returns a boolean, not data
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If no user_id provided, use auth.uid()
  IF check_user_id IS NULL THEN
    check_user_id := auth.uid();
  END IF;
  
  -- Return false if no user
  IF check_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Direct query bypasses RLS due to SECURITY DEFINER
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id
    AND role = 'admin'
  );
END;
$$;

ALTER FUNCTION public.is_admin(UUID) OWNER TO postgres;

-- ============================================================================
-- STEP 2: Fix user_roles policies - no self-reference
-- ============================================================================

-- Drop existing recursive policies
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;

-- SELECT: Users can see their own roles, admins can see all
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

-- INSERT: Users can assign themselves 'agent' role, admins can assign any
CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = (SELECT auth.uid()) AND role = 'agent')
    OR public.is_admin((SELECT auth.uid()))
  );

-- UPDATE: Only admins
CREATE POLICY "user_roles_update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- DELETE: Only admins
CREATE POLICY "user_roles_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- ============================================================================
-- STEP 3: Update all other policies that check admin via user_roles subquery
-- ============================================================================

-- CREDITS
DROP POLICY IF EXISTS "credits_select" ON public.credits;
DROP POLICY IF EXISTS "credits_update" ON public.credits;

CREATE POLICY "credits_select" ON public.credits
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "credits_update" ON public.credits
  FOR UPDATE TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- CREDIT_TRANSACTIONS
DROP POLICY IF EXISTS "credit_transactions_select" ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_insert" ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_delete" ON public.credit_transactions;

CREATE POLICY "credit_transactions_select" ON public.credit_transactions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "credit_transactions_insert" ON public.credit_transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin((SELECT auth.uid())));

CREATE POLICY "credit_transactions_delete" ON public.credit_transactions
  FOR DELETE TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_delete" ON public.subscriptions;

CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "subscriptions_update" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

CREATE POLICY "subscriptions_delete" ON public.subscriptions
  FOR DELETE TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- INVITATION_TOKENS
DROP POLICY IF EXISTS "invitation_tokens_select" ON public.invitation_tokens;
DROP POLICY IF EXISTS "invitation_tokens_insert" ON public.invitation_tokens;
DROP POLICY IF EXISTS "invitation_tokens_update" ON public.invitation_tokens;
DROP POLICY IF EXISTS "invitation_tokens_delete" ON public.invitation_tokens;

CREATE POLICY "invitation_tokens_select" ON public.invitation_tokens
  FOR SELECT TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

CREATE POLICY "invitation_tokens_insert" ON public.invitation_tokens
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin((SELECT auth.uid())));

CREATE POLICY "invitation_tokens_update" ON public.invitation_tokens
  FOR UPDATE TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

CREATE POLICY "invitation_tokens_delete" ON public.invitation_tokens
  FOR DELETE TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- PROFILES
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT
  USING (
    is_visible = true
    OR id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- PROPERTIES
DROP POLICY IF EXISTS "properties_select" ON public.properties;
DROP POLICY IF EXISTS "properties_update" ON public.properties;
DROP POLICY IF EXISTS "properties_delete" ON public.properties;

CREATE POLICY "properties_select" ON public.properties
  FOR SELECT
  USING (
    -- Public can see active properties from agents with active subscriptions
    (
      status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.user_id = properties.user_id
        AND s.status = 'active'
      )
    )
    -- Owner can see all their properties
    OR user_id = (SELECT auth.uid())
    -- Admin can see all
    OR public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "properties_update" ON public.properties
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "properties_delete" ON public.properties
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

-- AUDIT_LOGS
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- VIDEO_GENERATION_JOBS
DROP POLICY IF EXISTS "video_generation_jobs_select" ON public.video_generation_jobs;
DROP POLICY IF EXISTS "video_generation_jobs_insert" ON public.video_generation_jobs;
DROP POLICY IF EXISTS "video_generation_jobs_update" ON public.video_generation_jobs;
DROP POLICY IF EXISTS "video_generation_jobs_delete" ON public.video_generation_jobs;

CREATE POLICY "video_generation_jobs_select" ON public.video_generation_jobs
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "video_generation_jobs_insert" ON public.video_generation_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "video_generation_jobs_update" ON public.video_generation_jobs
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "video_generation_jobs_delete" ON public.video_generation_jobs
  FOR DELETE TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- PROPERTY_DRAFTS
DROP POLICY IF EXISTS "property_drafts_select" ON public.property_drafts;
DROP POLICY IF EXISTS "property_drafts_insert" ON public.property_drafts;
DROP POLICY IF EXISTS "property_drafts_update" ON public.property_drafts;
DROP POLICY IF EXISTS "property_drafts_delete" ON public.property_drafts;

CREATE POLICY "property_drafts_select" ON public.property_drafts
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "property_drafts_insert" ON public.property_drafts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "property_drafts_update" ON public.property_drafts
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "property_drafts_delete" ON public.property_drafts
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

-- ============================================================================
-- STEP 4: Update get_agent_dashboard_stats to use is_admin instead of has_role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_agent_dashboard_stats(agent_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  user_id UUID,
  total_properties BIGINT,
  active_properties BIGINT,
  total_views BIGINT,
  total_leads BIGINT,
  views_this_week BIGINT,
  leads_this_month BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If agent_user_id is provided, use it; otherwise use auth.uid()
  IF agent_user_id IS NULL THEN
    agent_user_id := auth.uid();
  ELSIF agent_user_id != auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to view stats for this user';
  END IF;

  RETURN QUERY
  SELECT
    agent_user_id AS user_id,
    COUNT(*) AS total_properties,
    COUNT(*) FILTER (WHERE p.status = 'active') AS active_properties,
    COALESCE(SUM(COALESCE((p.characteristics->>'views')::BIGINT, 0)), 0) AS total_views,
    0::BIGINT AS total_leads,
    0::BIGINT AS views_this_week,
    0::BIGINT AS leads_this_month
  FROM public.properties p
  WHERE p.user_id = agent_user_id;
END;
$$;

ALTER FUNCTION public.get_agent_dashboard_stats(UUID) OWNER TO postgres;
