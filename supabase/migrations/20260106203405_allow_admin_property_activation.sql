-- Migration: Allow admins to bypass subscription check for property activation
-- Date: 2026-01-06
-- Description: Modifies the enforce_subscription_for_active_status trigger function
--              to allow admin users to set any property to 'active' status without
--              requiring the property owner to have an active subscription.

CREATE OR REPLACE FUNCTION public.enforce_subscription_for_active_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  has_subscription BOOLEAN;
  is_admin_user BOOLEAN;
BEGIN
  -- Check if the current user is an admin (they can bypass this check)
  SELECT public.is_admin(auth.uid()) INTO is_admin_user;
  
  IF is_admin_user THEN
    RETURN NEW;  -- Admins bypass all subscription checks
  END IF;

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
  
  -- Prevent users from changing 'paused' to anything except 'draft' without subscription
  IF OLD IS NOT NULL AND OLD.status = 'paused' AND NEW.status != 'draft' THEN
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

-- Add comment for documentation
COMMENT ON FUNCTION public.enforce_subscription_for_active_status() IS 
'Trigger function that enforces subscription requirements for activating properties. Admin users bypass this check.';
