-- Migration: Enforce subscription for active status
-- Date: 2026-01-06
-- 
-- This migration:
-- 1. Simplifies property status to: draft, active, paused
-- 2. Adds trigger to prevent setting status to 'active' without subscription
-- 3. Adds function to pause all properties when subscription ends

-- ============================================================================
-- STEP 1: Clean up old status values - convert to new simplified statuses
-- ============================================================================

-- Convert old statuses to new ones:
-- pending -> draft
-- sold -> paused (or you may want to delete these)
-- rented -> paused
-- archived -> paused
UPDATE public.properties
SET status = 'draft'
WHERE status IN ('pending');

UPDATE public.properties
SET status = 'paused'
WHERE status IN ('sold', 'rented', 'archived');

-- ============================================================================
-- STEP 2: Add constraint to limit status values
-- ============================================================================

-- Add check constraint for valid statuses (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'properties_status_check'
  ) THEN
    ALTER TABLE public.properties
    ADD CONSTRAINT properties_status_check 
    CHECK (status IN ('draft', 'active', 'paused'));
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create trigger to enforce subscription for active status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_subscription_for_active_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  has_subscription BOOLEAN;
BEGIN
  -- Only check when trying to set status to 'active'
  IF NEW.status = 'active' THEN
    -- Check if user has active subscription
    SELECT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = NEW.user_id
      AND s.status IN ('active', 'trialing')
    ) INTO has_subscription;
    
    -- If no active subscription, block the change
    IF NOT has_subscription THEN
      RAISE EXCEPTION 'Cannot set property to active without an active subscription';
    END IF;
  END IF;
  
  -- Also prevent users from changing 'paused' to anything except 'draft' without subscription
  IF OLD.status = 'paused' AND NEW.status != 'draft' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = NEW.user_id
      AND s.status IN ('active', 'trialing')
    ) INTO has_subscription;
    
    IF NOT has_subscription THEN
      RAISE EXCEPTION 'Cannot reactivate paused property without an active subscription';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS enforce_subscription_on_property_status ON public.properties;

-- Create trigger
CREATE TRIGGER enforce_subscription_on_property_status
  BEFORE INSERT OR UPDATE OF status ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_subscription_for_active_status();

-- ============================================================================
-- STEP 4: Create function to pause all properties when subscription ends
-- Called by Stripe webhook when subscription becomes inactive
-- ============================================================================

CREATE OR REPLACE FUNCTION public.pause_user_properties(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  paused_count INTEGER;
BEGIN
  -- Update all active properties to paused
  UPDATE public.properties
  SET status = 'paused', updated_at = NOW()
  WHERE user_id = p_user_id
  AND status = 'active';
  
  GET DIAGNOSTICS paused_count = ROW_COUNT;
  
  RETURN paused_count;
END;
$$;

ALTER FUNCTION public.pause_user_properties(UUID) OWNER TO postgres;

-- ============================================================================
-- STEP 5: Create function to reactivate properties when subscription resumes
-- Called by Stripe webhook when subscription becomes active again
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reactivate_user_properties(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  reactivated_count INTEGER;
BEGIN
  -- Only reactivate paused properties (not drafts)
  UPDATE public.properties
  SET status = 'active', updated_at = NOW()
  WHERE user_id = p_user_id
  AND status = 'paused';
  
  GET DIAGNOSTICS reactivated_count = ROW_COUNT;
  
  RETURN reactivated_count;
END;
$$;

ALTER FUNCTION public.reactivate_user_properties(UUID) OWNER TO postgres;
