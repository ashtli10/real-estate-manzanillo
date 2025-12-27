-- Migration: Add Stripe customer ID to profiles table
-- This allows storing the Stripe customer ID directly on profiles for faster lookups

-- Add stripe_customer_id column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add unique constraint to prevent duplicate customer IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer 
ON public.profiles(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- Update get_subscription_status to include stripe IDs
CREATE OR REPLACE FUNCTION public.get_subscription_status(check_user_id UUID)
RETURNS TABLE (
    status TEXT,
    plan_type TEXT,
    trial_ends_at TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    is_active BOOLEAN,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.status::TEXT,
        s.plan_type::TEXT,
        s.trial_ends_at,
        s.current_period_end,
        CASE 
            WHEN s.status IN ('trialing', 'active') THEN true
            WHEN s.status = 'trialing' AND s.trial_ends_at > now() THEN true
            ELSE false
        END as is_active,
        s.stripe_subscription_id,
        s.stripe_customer_id
    FROM public.subscriptions s
    WHERE s.user_id = check_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_subscription_status IS 'Get subscription status including Stripe IDs for a user';
