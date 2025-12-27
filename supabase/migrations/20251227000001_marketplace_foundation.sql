-- ============================================================================
-- Real Estate Manzanillo Marketplace Foundation
-- Migration: 20251227000001_marketplace_foundation.sql
-- Description: Creates core marketplace tables with comprehensive RLS policies
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- Stores user profile information for agents/brokers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT, -- For WhatsApp contact
    company_name TEXT, -- Agency/broker name
    avatar_url TEXT,
    language_preference TEXT DEFAULT 'es' CHECK (language_preference IN ('es', 'en')),
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.profiles IS 'User profiles for real estate agents and brokers';
COMMENT ON COLUMN public.profiles.phone IS 'Phone number for WhatsApp contact';
COMMENT ON COLUMN public.profiles.company_name IS 'Agency or broker company name';

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "profiles_select_admin" ON public.profiles
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- Users can update only their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for signup flow)
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. INVITATION TOKENS TABLE
-- Secure invitation system for new users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invitation_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    email TEXT, -- Optional, pre-fill if set
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    trial_days INTEGER DEFAULT 14 CHECK (trial_days > 0 AND trial_days <= 90),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ensure expires_at is in the future when created
    CONSTRAINT invitation_tokens_valid_expiry CHECK (expires_at > created_at)
);

COMMENT ON TABLE public.invitation_tokens IS 'Secure invitation tokens for new user registration';
COMMENT ON COLUMN public.invitation_tokens.trial_days IS 'Admin-configurable trial period per invite (1-90 days)';

-- Enable RLS
ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitation_tokens
-- Only admins can create tokens
CREATE POLICY "invitation_tokens_insert_admin" ON public.invitation_tokens
    FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can view tokens
CREATE POLICY "invitation_tokens_select_admin" ON public.invitation_tokens
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update tokens (e.g., to revoke)
CREATE POLICY "invitation_tokens_update_admin" ON public.invitation_tokens
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete tokens
CREATE POLICY "invitation_tokens_delete_admin" ON public.invitation_tokens
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 3. SUBSCRIPTIONS TABLE
-- Tracks user subscription status with Stripe integration
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'paused', 'incomplete', 'incomplete_expired')),
    plan_type TEXT DEFAULT 'standard' CHECK (plan_type IN ('standard', 'premium', 'enterprise')),
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.subscriptions IS 'User subscription status and Stripe integration data';
COMMENT ON COLUMN public.subscriptions.status IS 'Subscription status: trialing, active, past_due, canceled, paused, incomplete, incomplete_expired';
COMMENT ON COLUMN public.subscriptions.plan_type IS 'Subscription plan tier: standard, premium, enterprise';

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
-- Users can view their own subscription
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all subscriptions
CREATE POLICY "subscriptions_select_admin" ON public.subscriptions
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- No direct insert/update/delete from client - only via service role (webhooks)
-- Service role bypasses RLS automatically

-- ============================================================================
-- 4. CREDITS TABLE
-- Tracks user AI credits balance
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0 NOT NULL CHECK (balance >= 0),
    free_credits_remaining INTEGER DEFAULT 50 NOT NULL CHECK (free_credits_remaining >= 0),
    last_free_credit_reset TIMESTAMPTZ DEFAULT now(), -- For monthly reset tracking
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.credits IS 'User AI credits balance and free credits tracking';
COMMENT ON COLUMN public.credits.free_credits_remaining IS 'Remaining free credits that reset monthly';
COMMENT ON COLUMN public.credits.last_free_credit_reset IS 'Timestamp of last monthly free credit reset';

-- Enable RLS
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credits
-- Users can view their own credits
CREATE POLICY "credits_select_own" ON public.credits
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all credits
CREATE POLICY "credits_select_admin" ON public.credits
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- No direct insert/update from client - only via service role

-- ============================================================================
-- 5. CREDIT TRANSACTIONS TABLE
-- Audit trail for all credit movements
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Positive for add, negative for deduct
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('monthly_free', 'purchase', 'ai_usage', 'refund', 'bonus', 'adjustment')),
    description TEXT,
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ensure description is provided for adjustments
    CONSTRAINT credit_transactions_adjustment_needs_desc CHECK (
        transaction_type != 'adjustment' OR description IS NOT NULL
    )
);

COMMENT ON TABLE public.credit_transactions IS 'Audit trail for all credit transactions';
COMMENT ON COLUMN public.credit_transactions.amount IS 'Positive for credits added, negative for credits used';
COMMENT ON COLUMN public.credit_transactions.transaction_type IS 'Type: monthly_free, purchase, ai_usage, refund, bonus, adjustment';

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_transactions
-- Users can view their own transactions
CREATE POLICY "credit_transactions_select_own" ON public.credit_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all transactions
CREATE POLICY "credit_transactions_select_admin" ON public.credit_transactions
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- No direct insert from client - only via service role

-- ============================================================================
-- 6. AUDIT LOGS TABLE
-- Comprehensive audit trail for security and debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g., 'property.create', 'subscription.changed'
    entity_type TEXT, -- e.g., 'property', 'subscription', 'profile'
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit trail for all important actions';
COMMENT ON COLUMN public.audit_logs.action IS 'Action identifier like property.create, subscription.changed';
COMMENT ON COLUMN public.audit_logs.old_data IS 'Previous state of the entity (for updates/deletes)';
COMMENT ON COLUMN public.audit_logs.new_data IS 'New state of the entity (for creates/updates)';

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
-- Users can view their own audit logs
CREATE POLICY "audit_logs_select_own" ON public.audit_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all audit logs
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- No direct insert from client - only via triggers/service role

-- ============================================================================
-- 7. MODIFY PROPERTIES TABLE
-- Add user ownership and featured listings support
-- ============================================================================

-- Add new columns to properties table
ALTER TABLE public.properties 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

COMMENT ON COLUMN public.properties.user_id IS 'Owner of the property listing';
COMMENT ON COLUMN public.properties.is_featured IS 'Whether the property is featured/promoted';
COMMENT ON COLUMN public.properties.featured_until IS 'When the featured status expires';

-- Update existing properties to set user_id to the admin user
-- This finds the first admin user from user_roles table
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    SELECT user_id INTO admin_user_id 
    FROM public.user_roles 
    WHERE role = 'admin' 
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        UPDATE public.properties 
        SET user_id = admin_user_id 
        WHERE user_id IS NULL;
    END IF;
END $$;

-- Drop existing policies on properties to recreate them
DROP POLICY IF EXISTS "Anyone can view published properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can update properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can delete properties" ON public.properties;

-- New RLS Policies for properties

-- Public can view published properties from users with active subscriptions
-- This ensures properties are hidden when subscription lapses
CREATE POLICY "properties_select_public" ON public.properties
    FOR SELECT
    USING (
        is_published = true 
        AND (
            -- Allow if the property owner has an active/trialing subscription
            EXISTS (
                SELECT 1 FROM public.subscriptions s
                WHERE s.user_id = properties.user_id
                AND s.status IN ('active', 'trialing')
            )
            -- Or if there's no user_id (legacy properties) and viewer is admin
            OR (properties.user_id IS NULL AND public.has_role(auth.uid(), 'admin'))
            -- Or if the property belongs to an admin (admins don't need subscriptions)
            OR public.has_role(properties.user_id, 'admin')
        )
    );

-- Property owners can view all their own properties (even unpublished)
CREATE POLICY "properties_select_own" ON public.properties
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all properties
CREATE POLICY "properties_select_admin" ON public.properties
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- Users with active subscription can insert their own properties
CREATE POLICY "properties_insert_own" ON public.properties
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND (
            public.has_active_subscription(auth.uid())
            OR public.has_role(auth.uid(), 'admin')
        )
    );

-- Admins can insert any property
CREATE POLICY "properties_insert_admin" ON public.properties
    FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can update only their own properties
CREATE POLICY "properties_update_own" ON public.properties
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admins can update any property
CREATE POLICY "properties_update_admin" ON public.properties
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'));

-- Users can delete only their own properties
CREATE POLICY "properties_delete_own" ON public.properties
    FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can delete any property
CREATE POLICY "properties_delete_admin" ON public.properties
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- Security definer functions for controlled data access
-- ============================================================================

-- Check if user has an active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.subscriptions 
        WHERE subscriptions.user_id = check_user_id 
        AND status IN ('active', 'trialing')
    );
$$;

COMMENT ON FUNCTION public.has_active_subscription IS 'Check if a user has an active or trialing subscription';

-- Validate invitation token (security definer to bypass RLS)
-- Returns token validity, associated email, and trial days
CREATE OR REPLACE FUNCTION public.validate_invitation_token(token_value TEXT)
RETURNS TABLE (valid BOOLEAN, email TEXT, trial_days INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT 
        (expires_at > now() AND used_at IS NULL) AS valid,
        invitation_tokens.email,
        invitation_tokens.trial_days
    FROM public.invitation_tokens 
    WHERE token = token_value;
$$;

COMMENT ON FUNCTION public.validate_invitation_token IS 'Validate an invitation token and return its details (bypasses RLS)';

-- Use invitation token (marks as used)
-- Returns true if successfully used, false otherwise
CREATE OR REPLACE FUNCTION public.use_invitation_token(token_value TEXT, consuming_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    UPDATE public.invitation_tokens 
    SET 
        used_at = now(), 
        used_by = consuming_user_id
    WHERE token = token_value 
        AND expires_at > now() 
        AND used_at IS NULL;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated > 0;
END;
$$;

COMMENT ON FUNCTION public.use_invitation_token IS 'Mark an invitation token as used by a user';

-- Get user subscription status with details
CREATE OR REPLACE FUNCTION public.get_subscription_status(check_user_id UUID)
RETURNS TABLE (
    status TEXT,
    plan_type TEXT,
    trial_ends_at TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    is_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT 
        COALESCE(s.status, 'none') AS status,
        COALESCE(s.plan_type, 'none') AS plan_type,
        s.trial_ends_at,
        s.current_period_end,
        COALESCE(s.status IN ('active', 'trialing'), false) AS is_active
    FROM public.subscriptions s
    WHERE s.user_id = check_user_id;
$$;

COMMENT ON FUNCTION public.get_subscription_status IS 'Get detailed subscription status for a user';

-- Get user credits balance
CREATE OR REPLACE FUNCTION public.get_user_credits(check_user_id UUID)
RETURNS TABLE (
    balance INTEGER,
    free_credits_remaining INTEGER,
    last_reset TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT 
        credits.balance,
        credits.free_credits_remaining,
        credits.last_free_credit_reset AS last_reset
    FROM public.credits
    WHERE credits.user_id = check_user_id;
$$;

COMMENT ON FUNCTION public.get_user_credits IS 'Get credit balance for a user';

-- Deduct credits from user (used by server-side for AI operations)
CREATE OR REPLACE FUNCTION public.deduct_credits(
    target_user_id UUID,
    amount_to_deduct INTEGER,
    deduction_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_balance INTEGER;
    current_free INTEGER;
    deduct_from_free INTEGER;
    deduct_from_paid INTEGER;
BEGIN
    -- Get current balances
    SELECT balance, free_credits_remaining 
    INTO current_balance, current_free
    FROM public.credits
    WHERE user_id = target_user_id
    FOR UPDATE; -- Lock the row
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if enough credits
    IF (current_balance + current_free) < amount_to_deduct THEN
        RETURN false;
    END IF;
    
    -- Deduct from free credits first, then paid
    IF current_free >= amount_to_deduct THEN
        deduct_from_free := amount_to_deduct;
        deduct_from_paid := 0;
    ELSE
        deduct_from_free := current_free;
        deduct_from_paid := amount_to_deduct - current_free;
    END IF;
    
    -- Update credits
    UPDATE public.credits
    SET 
        balance = balance - deduct_from_paid,
        free_credits_remaining = free_credits_remaining - deduct_from_free,
        updated_at = now()
    WHERE user_id = target_user_id;
    
    -- Log the transaction
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
    VALUES (target_user_id, -amount_to_deduct, 'ai_usage', deduction_description);
    
    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.deduct_credits IS 'Deduct credits from user balance (free credits first, then paid)';

-- Add credits to user (used for purchases)
CREATE OR REPLACE FUNCTION public.add_credits(
    target_user_id UUID,
    amount_to_add INTEGER,
    txn_type TEXT,
    txn_description TEXT DEFAULT NULL,
    payment_intent_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update credits
    UPDATE public.credits
    SET 
        balance = balance + amount_to_add,
        updated_at = now()
    WHERE user_id = target_user_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Log the transaction
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, stripe_payment_intent_id)
    VALUES (target_user_id, amount_to_add, txn_type, txn_description, payment_intent_id);
    
    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.add_credits IS 'Add credits to user balance with transaction logging';

-- Reset monthly free credits (can be called by a cron job)
CREATE OR REPLACE FUNCTION public.reset_monthly_free_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    users_reset INTEGER;
BEGIN
    WITH updated AS (
        UPDATE public.credits
        SET 
            free_credits_remaining = 50,
            last_free_credit_reset = now(),
            updated_at = now()
        WHERE last_free_credit_reset < (now() - INTERVAL '30 days')
        RETURNING user_id
    ),
    logged AS (
        INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
        SELECT user_id, 50, 'monthly_free', 'Monthly free credits reset'
        FROM updated
    )
    SELECT COUNT(*) INTO users_reset FROM updated;
    
    RETURN users_reset;
END;
$$;

COMMENT ON FUNCTION public.reset_monthly_free_credits IS 'Reset monthly free credits for all eligible users';

-- Create profile and credits on user signup (trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, now(), now())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create credits record with initial free credits
    INSERT INTO public.credits (id, user_id, balance, free_credits_remaining, last_free_credit_reset, updated_at)
    VALUES (gen_random_uuid(), NEW.id, 0, 50, now(), now())
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Log the initial credit grant
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
    VALUES (NEW.id, 50, 'bonus', 'Welcome bonus: 50 free credits')
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile and credits for new users on signup';

-- Create trigger for new user signup (drop first if exists for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_credits_updated_at ON public.credits;
CREATE TRIGGER update_credits_updated_at
    BEFORE UPDATE ON public.credits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 9. AUDIT LOG TRIGGER
-- Automatically log changes to important tables
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    audit_user_id UUID;
    audit_action TEXT;
BEGIN
    -- Determine the user making the change
    audit_user_id := auth.uid();
    
    -- Determine the action
    audit_action := TG_TABLE_NAME || '.' || lower(TG_OP);
    
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data)
        VALUES (audit_user_id, audit_action, TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (audit_user_id, audit_action, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
        VALUES (audit_user_id, audit_action, TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.audit_log_trigger IS 'Generic audit log trigger for tracking changes';

-- Apply audit trigger to properties table
DROP TRIGGER IF EXISTS audit_properties_changes ON public.properties;
CREATE TRIGGER audit_properties_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_log_trigger();

-- Apply audit trigger to subscriptions table
DROP TRIGGER IF EXISTS audit_subscriptions_changes ON public.subscriptions;
CREATE TRIGGER audit_subscriptions_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- 10. PERFORMANCE INDEXES
-- ============================================================================

-- Properties indexes
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_is_published ON public.properties(is_published);
CREATE INDEX IF NOT EXISTS idx_properties_is_featured ON public.properties(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_properties_featured_until ON public.properties(featured_until) WHERE featured_until IS NOT NULL;

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON public.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Invitation tokens indexes
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON public.invitation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_expires_at ON public.invitation_tokens(expires_at) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_created_by ON public.invitation_tokens(created_by);

-- Credits indexes
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON public.credits(user_id);

-- Credit transactions indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(transaction_type);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- 11. GRANT PERMISSIONS
-- Ensure anon and authenticated roles have proper access
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select on public-facing tables
GRANT SELECT ON public.properties TO anon, authenticated;

-- Grant full access to authenticated users (RLS will restrict)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.credits TO authenticated;
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitation_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_invitation_token(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_credits(UUID) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
