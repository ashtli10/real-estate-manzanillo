-- Migration: Fix RLS Performance Issues
-- Date: 2026-01-06
-- Fixes:
--   1. auth_rls_initplan: Wrap auth.uid() with (select auth.uid()) to prevent per-row evaluation
--   2. multiple_permissive_policies: Consolidate into single policies with OR conditions  
--   3. duplicate_index: Drop duplicate indexes

-- ============================================================================
-- PART 1: DROP DUPLICATE INDEXES
-- ============================================================================

DROP INDEX IF EXISTS public.idx_credit_transactions_user_id;
DROP INDEX IF EXISTS public.idx_credits_user_id;
DROP INDEX IF EXISTS public.idx_profiles_visible;
DROP INDEX IF EXISTS public.idx_properties_is_featured;
DROP INDEX IF EXISTS public.idx_subscriptions_user_id;

-- ============================================================================
-- PART 2: FIX CREDITS TABLE RLS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "credits_select_own" ON public.credits;
DROP POLICY IF EXISTS "credits_select_admin" ON public.credits;
DROP POLICY IF EXISTS "credits_insert_own" ON public.credits;
DROP POLICY IF EXISTS "credits_update_admin_only" ON public.credits;

-- Create optimized consolidated policies
CREATE POLICY "credits_select" ON public.credits
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "credits_insert" ON public.credits
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "credits_update" ON public.credits
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- PART 3: FIX CREDIT_TRANSACTIONS TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "credit_transactions_select_own" ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_select_admin" ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_insert_admin_only" ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_delete_admin_only" ON public.credit_transactions;

CREATE POLICY "credit_transactions_select" ON public.credit_transactions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "credit_transactions_insert" ON public.credit_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "credit_transactions_delete" ON public.credit_transactions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- PART 4: FIX SUBSCRIPTIONS TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_admin" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_own" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_admin_only" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_delete_admin_only" ON public.subscriptions;

CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "subscriptions_insert" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "subscriptions_update" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "subscriptions_delete" ON public.subscriptions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- PART 5: FIX INVITATION_TOKENS TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "invitation_tokens_select_admin" ON public.invitation_tokens;
DROP POLICY IF EXISTS "invitation_tokens_insert_admin" ON public.invitation_tokens;
DROP POLICY IF EXISTS "invitation_tokens_update_admin" ON public.invitation_tokens;
DROP POLICY IF EXISTS "invitation_tokens_delete_admin" ON public.invitation_tokens;

CREATE POLICY "invitation_tokens_select" ON public.invitation_tokens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "invitation_tokens_insert" ON public.invitation_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "invitation_tokens_update" ON public.invitation_tokens
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "invitation_tokens_delete" ON public.invitation_tokens
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- PART 6: FIX PROFILES TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_public_or_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;

-- Public can view visible profiles, authenticated can view own or if admin
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT
  USING (
    is_visible = true
    OR id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- PART 7: FIX PROPERTIES TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "properties_select_own" ON public.properties;
DROP POLICY IF EXISTS "properties_select_admin" ON public.properties;
DROP POLICY IF EXISTS "properties_select_public_active_with_subscription" ON public.properties;
DROP POLICY IF EXISTS "properties_insert_own" ON public.properties;
DROP POLICY IF EXISTS "properties_update_own_or_admin" ON public.properties;
DROP POLICY IF EXISTS "properties_delete_own_or_admin" ON public.properties;

-- Consolidated SELECT: public active properties OR own OR admin
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
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "properties_insert" ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "properties_update" ON public.properties
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "properties_delete" ON public.properties
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- PART 8: FIX USER_ROLES TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_own_agent_or_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin_only" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin_only" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- Users can insert their own agent role, admins can insert any
CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = (SELECT auth.uid()) AND role = 'agent')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "user_roles_update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "user_roles_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- ============================================================================
-- PART 9: FIX AUDIT_LOGS TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_system" ON public.audit_logs;

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

-- System/service role can insert (no auth.uid() check needed for service role)
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- PART 10: FIX VIDEO_GENERATION_JOBS TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own video jobs" ON public.video_generation_jobs;
DROP POLICY IF EXISTS "Users can insert own video jobs" ON public.video_generation_jobs;
DROP POLICY IF EXISTS "Users can update own video jobs" ON public.video_generation_jobs;
DROP POLICY IF EXISTS "Admins can manage all video jobs" ON public.video_generation_jobs;

CREATE POLICY "video_generation_jobs_select" ON public.video_generation_jobs
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "video_generation_jobs_insert" ON public.video_generation_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "video_generation_jobs_update" ON public.video_generation_jobs
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "video_generation_jobs_delete" ON public.video_generation_jobs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- PART 11: FIX PROPERTY_DRAFTS TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own drafts" ON public.property_drafts;
DROP POLICY IF EXISTS "Users can insert own drafts" ON public.property_drafts;
DROP POLICY IF EXISTS "Users can update own drafts" ON public.property_drafts;
DROP POLICY IF EXISTS "Users can delete own drafts" ON public.property_drafts;
DROP POLICY IF EXISTS "Admins can manage all drafts" ON public.property_drafts;

CREATE POLICY "property_drafts_select" ON public.property_drafts
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "property_drafts_insert" ON public.property_drafts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "property_drafts_update" ON public.property_drafts
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "property_drafts_delete" ON public.property_drafts
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );
