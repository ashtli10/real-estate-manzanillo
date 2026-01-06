-- Migration: Add user_roles creation to handle_new_user trigger
-- This ensures every new user gets a default 'agent' role

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Create profile using explicit schema reference
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, ''),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create credits record with 50 free credits
    INSERT INTO public.credits (user_id, balance, free_credits_remaining, created_at, updated_at)
    VALUES (NEW.id, 0, 50, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create user_roles record with 'agent' role
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (NEW.id, 'agent', NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the signup
        RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;
