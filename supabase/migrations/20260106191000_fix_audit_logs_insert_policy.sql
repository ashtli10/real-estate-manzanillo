-- Migration: Fix audit_logs INSERT policy
-- Date: 2026-01-06
-- Issue: rls_policy_always_true - WITH CHECK (true) is too permissive
-- Solution: Audit logs should only be inserted by triggers/service role, not directly by users

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

-- No INSERT policy needed for authenticated users
-- Triggers run with SECURITY DEFINER and bypass RLS
-- Service role also bypasses RLS
-- This prevents direct inserts from regular authenticated users
