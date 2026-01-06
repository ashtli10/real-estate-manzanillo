


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'Removed saved_properties - only agents have accounts, not public users';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_credits"("p_user_id" "uuid", "p_amount" integer, "p_product" "text" DEFAULT 'Créditos'::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO credits (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    balance = COALESCE(credits.balance, 0) + p_amount,
    updated_at = NOW();

  INSERT INTO credit_transactions (user_id, amount, product)
  VALUES (p_user_id, p_amount, p_product);

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in add_credits: %', SQLERRM;
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."add_credits"("p_user_id" "uuid", "p_amount" integer, "p_product" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_property_drafts"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM property_drafts 
  WHERE updated_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_property_drafts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deduct_credits"("p_user_id" "uuid", "p_amount" integer, "p_product" "text" DEFAULT 'Créditos'::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_free_credits INT;
  v_paid_credits INT;
  v_total INT;
  v_deduct_free INT;
  v_deduct_paid INT;
BEGIN
  SELECT 
    COALESCE(free_credits_remaining, 0),
    COALESCE(balance, 0)
  INTO v_free_credits, v_paid_credits
  FROM credits
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  v_total := v_free_credits + v_paid_credits;

  IF v_total < p_amount THEN
    RETURN FALSE;
  END IF;

  v_deduct_free := LEAST(v_free_credits, p_amount);
  v_deduct_paid := p_amount - v_deduct_free;

  UPDATE credits
  SET 
    free_credits_remaining = v_free_credits - v_deduct_free,
    balance = v_paid_credits - v_deduct_paid,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (user_id, amount, product)
  VALUES (p_user_id, -p_amount, p_product);

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in deduct_credits: %', SQLERRM;
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."deduct_credits"("p_user_id" "uuid", "p_amount" integer, "p_product" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_property_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from title
  base_slug := lower(regexp_replace(
    regexp_replace(NEW.title, '[^a-zA-Z0-9\s]', '', 'g'),
    '\s+', '-', 'g'
  ));
  
  -- Add property type
  base_slug := base_slug || '-' || NEW.property_type;
  
  -- Add random suffix for uniqueness
  final_slug := base_slug || '-' || substring(gen_random_uuid()::text, 1, 8);
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_property_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_agent_dashboard_stats"("agent_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("user_id" "uuid", "total_properties" bigint, "active_properties" bigint, "total_views" bigint, "total_leads" bigint, "views_this_week" bigint, "leads_this_month" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  -- If agent_user_id is provided, use it; otherwise use auth.uid()
  -- Only allow users to see their own stats unless they're admin
  IF agent_user_id IS NULL THEN
    agent_user_id := auth.uid();
  ELSIF agent_user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized to view stats for this user';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    COUNT(DISTINCT p.id) as total_properties,
    COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_properties,
    COUNT(DISTINCT pv.id) as total_views,
    COUNT(DISTINCT pl.id) as total_leads,
    COUNT(DISTINCT CASE WHEN pv.viewed_at > NOW() - INTERVAL '7 days' THEN pv.id END) as views_this_week,
    COUNT(DISTINCT CASE WHEN pl.created_at > NOW() - INTERVAL '30 days' THEN pl.id END) as leads_this_month
  FROM properties p
  LEFT JOIN property_views pv ON pv.property_id = p.id
  LEFT JOIN property_leads pl ON pl.property_id = p.id
  WHERE p.user_id = agent_user_id
  GROUP BY p.user_id;
END;
$$;


ALTER FUNCTION "public"."get_agent_dashboard_stats"("agent_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_agent_dashboard_stats"("agent_user_id" "uuid") IS 'Get dashboard statistics for an agent. Users can only view their own stats unless admin.';



CREATE OR REPLACE FUNCTION "public"."get_subscription_status"("check_user_id" "uuid") RETURNS TABLE("status" "text", "plan_type" "text", "trial_ends_at" timestamp with time zone, "current_period_end" timestamp with time zone, "is_active" boolean, "stripe_subscription_id" "text", "stripe_customer_id" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_subscription_status"("check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_supabase_url"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  url TEXT;
BEGIN
  SELECT decrypted_secret INTO url 
  FROM vault.decrypted_secrets 
  WHERE name = 'supabase_url';
  RETURN url;
END;
$$;


ALTER FUNCTION "public"."get_supabase_url"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_supabase_url"() IS 'Retrieves Supabase project URL from vault for Edge Function calls';



CREATE OR REPLACE FUNCTION "public"."get_user_credits"("check_user_id" "uuid") RETURNS TABLE("balance" integer, "free_credits_remaining" integer, "last_free_credits_reset" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- SECURITY: Only allow getting own credits
    IF auth.uid() IS NULL OR auth.uid() != check_user_id THEN
        RAISE EXCEPTION 'Not authorized to view credits for this user';
    END IF;

    RETURN QUERY
    SELECT c.balance, c.free_credits_remaining, c.last_free_credits_reset
    FROM public.credits c
    WHERE c.user_id = check_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_credits"("check_user_id" "uuid") OWNER TO "postgres";


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
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the signup
        RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_active_subscription"("check_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  sub_status TEXT;
  trial_end TIMESTAMPTZ;
BEGIN
  SELECT status, trial_ends_at INTO sub_status, trial_end
  FROM subscriptions
  WHERE user_id = check_user_id;
  
  -- If no subscription record, return false
  IF sub_status IS NULL THEN
    RETURN false;
  END IF;
  
  -- Active subscription
  IF sub_status = 'active' THEN
    RETURN true;
  END IF;
  
  -- Trial period (check if still valid)
  IF sub_status = 'trialing' AND trial_end > NOW() THEN
    RETURN true;
  END IF;
  
  -- Past due (give grace period)
  IF sub_status = 'past_due' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;


ALTER FUNCTION "public"."has_active_subscription"("check_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_active_subscription"("check_user_id" "uuid") IS 'Helper function to check if user has an active subscription for property visibility';



CREATE OR REPLACE FUNCTION "public"."has_role"("check_user_id" "uuid", "check_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = check_user_id AND role = check_role
    );
END;
$$;


ALTER FUNCTION "public"."has_role"("check_user_id" "uuid", "check_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_cleanup_draft_files"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  base_url TEXT;
BEGIN
  IF OLD.uploaded_files IS NULL OR array_length(OLD.uploaded_files, 1) IS NULL THEN
    RETURN OLD;
  END IF;

  base_url := public.get_supabase_url();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for draft %', OLD.id;
    RETURN OLD;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(current_setting('request.jwt.claims', true)::json->>'sub', '')
    ),
    body := jsonb_build_object(
      'type', 'draft',
      'user_id', OLD.user_id::text,
      'entity_id', OLD.id::text,
      'files', to_jsonb(OLD.uploaded_files)
    ),
    timeout_milliseconds := 30000
  );
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."trigger_cleanup_draft_files"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_cleanup_draft_files"() IS 'Trigger function to clean up uploaded files when a property draft is deleted';



CREATE OR REPLACE FUNCTION "public"."trigger_cleanup_property_files"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  base_url TEXT;
BEGIN
  -- Get the Supabase URL from vault
  base_url := public.get_supabase_url();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for property %', OLD.id;
    RETURN OLD;
  END IF;

  -- Call the storage-cleanup Edge Function asynchronously
  PERFORM net.http_post(
    url := base_url || '/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(current_setting('request.jwt.claims', true)::json->>'sub', '')
    ),
    body := jsonb_build_object(
      'type', 'property',
      'user_id', OLD.user_id::text,
      'entity_id', OLD.id::text
    ),
    timeout_milliseconds := 30000
  );
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."trigger_cleanup_property_files"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_cleanup_property_files"() IS 'Trigger function to clean up R2 storage when a property is deleted';



CREATE OR REPLACE FUNCTION "public"."trigger_cleanup_user_files"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  base_url TEXT;
BEGIN
  base_url := public.get_supabase_url();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for user %', OLD.id;
    RETURN OLD;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(current_setting('request.jwt.claims', true)::json->>'sub', '')
    ),
    body := jsonb_build_object(
      'type', 'user',
      'user_id', OLD.id::text,
      'entity_id', OLD.id::text
    ),
    timeout_milliseconds := 60000
  );
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."trigger_cleanup_user_files"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_cleanup_user_files"() IS 'Trigger function to clean up all R2 storage when a user profile is deleted';



CREATE OR REPLACE FUNCTION "public"."trigger_cleanup_video_job_files"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  base_url TEXT;
BEGIN
  base_url := public.get_supabase_url();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for video job %', OLD.id;
    RETURN OLD;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(current_setting('request.jwt.claims', true)::json->>'sub', '')
    ),
    body := jsonb_build_object(
      'type', 'video-job',
      'user_id', OLD.user_id::text,
      'entity_id', OLD.id::text
    ),
    timeout_milliseconds := 30000
  );
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."trigger_cleanup_video_job_files"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_cleanup_video_job_files"() IS 'Trigger function to clean up R2 storage when a video job is deleted';



CREATE OR REPLACE FUNCTION "public"."update_credits_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_credits_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profiles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_properties_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_properties_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_property_drafts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_property_drafts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subscriptions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_subscriptions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tasks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tasks_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_video_generation_jobs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_video_generation_jobs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."use_invitation_token"("invite_token" "text", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  token_record RECORD;
BEGIN
  -- Find the token
  SELECT * INTO token_record
  FROM invitation_tokens
  WHERE token = invite_token
    AND used_at IS NULL
    AND expires_at > NOW();
  
  -- If not found or already used/expired, return false
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Mark the token as used
  UPDATE invitation_tokens
  SET used_at = NOW(),
      used_by = user_uuid
  WHERE token = invite_token;
  
  -- Create a subscription with trial period for the user
  INSERT INTO subscriptions (user_id, status, trial_ends_at)
  VALUES (
    user_uuid,
    'trialing',
    CASE 
      WHEN token_record.trial_days > 0 THEN NOW() + (token_record.trial_days || ' days')::interval
      ELSE NULL
    END
  )
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'trialing',
      trial_ends_at = CASE 
        WHEN token_record.trial_days > 0 THEN NOW() + (token_record.trial_days || ' days')::interval
        ELSE NULL
      END,
      updated_at = NOW();
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."use_invitation_token"("invite_token" "text", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_invitation_token"("invite_token" "text") RETURNS TABLE("is_valid" boolean, "token_email" "text", "token_trial_days" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (it.used_at IS NULL AND it.expires_at > NOW()) AS is_valid,
    it.email AS token_email,
    COALESCE(it.trial_days, 0) AS token_trial_days
  FROM invitation_tokens it
  WHERE it.token = invite_token;
  
  -- If no rows found, return invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, 0;
  END IF;
END;
$$;


ALTER FUNCTION "public"."validate_invitation_token"("invite_token" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "product" "text" DEFAULT 'Créditos'::"text" NOT NULL
);


ALTER TABLE "public"."credit_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "balance" integer DEFAULT 0,
    "free_credits_remaining" integer DEFAULT 50,
    "last_free_credit_reset" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credits_balance_check" CHECK (("balance" >= 0)),
    CONSTRAINT "credits_free_credits_remaining_check" CHECK (("free_credits_remaining" >= 0))
);


ALTER TABLE "public"."credits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitation_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "email" "text",
    "created_by" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "used_by" "uuid",
    "trial_days" integer DEFAULT 14,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text" DEFAULT ''::"text",
    CONSTRAINT "invitation_tokens_trial_days_check" CHECK ((("trial_days" >= 0) AND ("trial_days" <= 90)))
);


ALTER TABLE "public"."invitation_tokens" OWNER TO "postgres";


COMMENT ON COLUMN "public"."invitation_tokens"."notes" IS 'Internal notes about the invitation';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "phone_number" "text",
    "company_name" "text",
    "profile_image" "text",
    "stripe_customer_id" "text",
    "language_preference" "text" DEFAULT 'es'::"text",
    "email_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "username" "text",
    "bio" "text",
    "whatsapp_number" "text",
    "cover_image" "text",
    "location" "text",
    "is_visible" boolean DEFAULT true,
    "onboarding_completed" boolean DEFAULT false,
    CONSTRAINT "profiles_language_preference_check" CHECK (("language_preference" = ANY (ARRAY['es'::"text", 'en'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."phone_number" IS 'Agent phone number for contact';



COMMENT ON COLUMN "public"."profiles"."profile_image" IS 'Profile image URL for the agent';



COMMENT ON COLUMN "public"."profiles"."username" IS 'Unique username for agent profile URL (e.g., domain.com/username)';



COMMENT ON COLUMN "public"."profiles"."whatsapp_number" IS 'WhatsApp number with country code for client contact';



COMMENT ON COLUMN "public"."profiles"."is_visible" IS 'Whether agent profile and properties are publicly visible';



COMMENT ON COLUMN "public"."profiles"."onboarding_completed" IS 'Whether agent has completed onboarding flow';



CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "property_type" "text" NOT NULL,
    "price" numeric(15,2) NOT NULL,
    "currency" "text" DEFAULT 'MXN'::"text",
    "images" "text"[] DEFAULT '{}'::"text"[],
    "videos" "text"[] DEFAULT '{}'::"text"[],
    "status" "text" DEFAULT 'draft'::"text",
    "is_featured" boolean DEFAULT false,
    "slug" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "display_order" integer DEFAULT 0,
    "is_for_sale" boolean DEFAULT true,
    "is_for_rent" boolean DEFAULT false,
    "rent_price" numeric,
    "rent_currency" "text" DEFAULT 'MXN'::"text",
    "location_city" "text",
    "location_state" "text",
    "location_neighborhood" "text",
    "location_address" "text",
    "location_lat" numeric,
    "location_lng" numeric,
    "show_map" boolean DEFAULT true,
    "characteristics" "jsonb" DEFAULT '[]'::"jsonb",
    "custom_bonuses" "jsonb" DEFAULT '[]'::"jsonb",
    "image_count" integer DEFAULT 0,
    "video_count" integer DEFAULT 0,
    CONSTRAINT "properties_property_type_check" CHECK (("property_type" = ANY (ARRAY['casa'::"text", 'departamento'::"text", 'terreno'::"text", 'local'::"text", 'oficina'::"text", 'bodega'::"text", 'otro'::"text"]))),
    CONSTRAINT "properties_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'active'::"text", 'sold'::"text", 'rented'::"text", 'paused'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


COMMENT ON COLUMN "public"."properties"."image_count" IS 'Number of images uploaded for this property (max 50)';



COMMENT ON COLUMN "public"."properties"."video_count" IS 'Number of videos uploaded for this property (max 3)';



CREATE TABLE IF NOT EXISTS "public"."property_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "property_id" "uuid",
    "form_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "current_step" "text" DEFAULT 'basic'::"text" NOT NULL,
    "ai_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "uploaded_files" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."property_drafts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."property_drafts"."uploaded_files" IS 'Array of R2 file paths uploaded during draft creation - used for cleanup when draft is abandoned';



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_subscription_id" "text",
    "stripe_customer_id" "text",
    "status" "text" DEFAULT 'none'::"text",
    "plan_type" "text" DEFAULT 'standard'::"text",
    "trial_ends_at" timestamp with time zone,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscriptions_plan_type_check" CHECK (("plan_type" = ANY (ARRAY['standard'::"text", 'premium'::"text", 'enterprise'::"text", 'none'::"text"]))),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['trialing'::"text", 'active'::"text", 'past_due'::"text", 'canceled'::"text", 'paused'::"text", 'incomplete'::"text", 'incomplete_expired'::"text", 'none'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'agent'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_generation_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "selected_images" "text"[] NOT NULL,
    "notes" "text",
    "image_urls" "text"[],
    "video_url" "text",
    "error_message" "text",
    "credits_charged" integer DEFAULT 0 NOT NULL,
    "credits_refunded" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "script" "jsonb",
    CONSTRAINT "video_generation_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'images_ready'::"text", 'script_ready'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."video_generation_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_generation_jobs" IS 'Tracks AI video generation jobs with status, generated images, scripts, and final video URLs';



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credits"
    ADD CONSTRAINT "credits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credits"
    ADD CONSTRAINT "credits_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."invitation_tokens"
    ADD CONSTRAINT "invitation_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitation_tokens"
    ADD CONSTRAINT "invitation_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."property_drafts"
    ADD CONSTRAINT "property_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_drafts"
    ADD CONSTRAINT "property_drafts_user_id_property_id_key" UNIQUE ("user_id", "property_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."video_generation_jobs"
    ADD CONSTRAINT "video_generation_jobs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_user" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_credit_transactions_created_at" ON "public"."credit_transactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_credit_transactions_product" ON "public"."credit_transactions" USING "btree" ("product");



CREATE INDEX "idx_credit_transactions_user" ON "public"."credit_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_credit_transactions_user_id" ON "public"."credit_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_credits_user" ON "public"."credits" USING "btree" ("user_id");



CREATE INDEX "idx_credits_user_id" ON "public"."credits" USING "btree" ("user_id");



CREATE INDEX "idx_invitation_tokens_email" ON "public"."invitation_tokens" USING "btree" ("email") WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_invitation_tokens_expires_at" ON "public"."invitation_tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_invitation_tokens_token" ON "public"."invitation_tokens" USING "btree" ("token");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_is_visible" ON "public"."profiles" USING "btree" ("is_visible") WHERE ("is_visible" = true);



CREATE UNIQUE INDEX "idx_profiles_stripe_customer" ON "public"."profiles" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE INDEX "idx_profiles_stripe_customer_id" ON "public"."profiles" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username") WHERE ("username" IS NOT NULL);



CREATE INDEX "idx_profiles_visible" ON "public"."profiles" USING "btree" ("is_visible") WHERE ("is_visible" = true);



CREATE INDEX "idx_properties_active_rent" ON "public"."properties" USING "btree" ("status", "is_for_rent", "created_at" DESC) WHERE (("status" = 'active'::"text") AND ("is_for_rent" = true));



CREATE INDEX "idx_properties_active_sale" ON "public"."properties" USING "btree" ("status", "is_for_sale", "created_at" DESC) WHERE (("status" = 'active'::"text") AND ("is_for_sale" = true));



CREATE INDEX "idx_properties_created_at" ON "public"."properties" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_properties_display_order" ON "public"."properties" USING "btree" ("display_order");



CREATE INDEX "idx_properties_featured" ON "public"."properties" USING "btree" ("is_featured") WHERE ("is_featured" = true);



CREATE INDEX "idx_properties_is_featured" ON "public"."properties" USING "btree" ("is_featured") WHERE ("is_featured" = true);



CREATE INDEX "idx_properties_is_for_rent" ON "public"."properties" USING "btree" ("is_for_rent") WHERE ("is_for_rent" = true);



CREATE INDEX "idx_properties_is_for_sale" ON "public"."properties" USING "btree" ("is_for_sale") WHERE ("is_for_sale" = true);



CREATE INDEX "idx_properties_location_neighborhood" ON "public"."properties" USING "btree" ("location_neighborhood");



CREATE INDEX "idx_properties_price" ON "public"."properties" USING "btree" ("price");



CREATE INDEX "idx_properties_property_type" ON "public"."properties" USING "btree" ("property_type");



CREATE INDEX "idx_properties_slug" ON "public"."properties" USING "btree" ("slug");



CREATE INDEX "idx_properties_status" ON "public"."properties" USING "btree" ("status");



CREATE INDEX "idx_properties_user_id" ON "public"."properties" USING "btree" ("user_id");



CREATE INDEX "idx_property_drafts_updated_at" ON "public"."property_drafts" USING "btree" ("updated_at");



CREATE INDEX "idx_property_drafts_user_id" ON "public"."property_drafts" USING "btree" ("user_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_stripe_customer_id" ON "public"."subscriptions" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE INDEX "idx_subscriptions_stripe_subscription_id" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id") WHERE ("stripe_subscription_id" IS NOT NULL);



CREATE INDEX "idx_subscriptions_user" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_subscriptions_user_id" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("role");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_video_generation_jobs_created_at" ON "public"."video_generation_jobs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_video_generation_jobs_property_id" ON "public"."video_generation_jobs" USING "btree" ("property_id");



CREATE INDEX "idx_video_generation_jobs_status" ON "public"."video_generation_jobs" USING "btree" ("status");



CREATE INDEX "idx_video_generation_jobs_user_id" ON "public"."video_generation_jobs" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "generate_property_slug_trigger" BEFORE INSERT ON "public"."properties" FOR EACH ROW WHEN (("new"."slug" IS NULL)) EXECUTE FUNCTION "public"."generate_property_slug"();



CREATE OR REPLACE TRIGGER "on_draft_delete" AFTER DELETE ON "public"."property_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_cleanup_draft_files"();



COMMENT ON TRIGGER "on_draft_delete" ON "public"."property_drafts" IS 'Cleans up uploaded files when property draft is deleted';



CREATE OR REPLACE TRIGGER "on_property_delete" AFTER DELETE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_cleanup_property_files"();



COMMENT ON TRIGGER "on_property_delete" ON "public"."properties" IS 'Cleans up R2 storage files when property is deleted';



CREATE OR REPLACE TRIGGER "on_user_delete" AFTER DELETE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_cleanup_user_files"();



COMMENT ON TRIGGER "on_user_delete" ON "public"."profiles" IS 'Cleans up all R2 storage files when user profile is deleted';



CREATE OR REPLACE TRIGGER "on_video_job_delete" AFTER DELETE ON "public"."video_generation_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_cleanup_video_job_files"();



COMMENT ON TRIGGER "on_video_job_delete" ON "public"."video_generation_jobs" IS 'Cleans up R2 storage files when video job is deleted';



CREATE OR REPLACE TRIGGER "trigger_update_property_drafts_updated_at" BEFORE UPDATE ON "public"."property_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."update_property_drafts_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_video_generation_jobs_updated_at" BEFORE UPDATE ON "public"."video_generation_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_video_generation_jobs_updated_at"();



CREATE OR REPLACE TRIGGER "update_credits_updated_at_trigger" BEFORE UPDATE ON "public"."credits" FOR EACH ROW EXECUTE FUNCTION "public"."update_credits_updated_at"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at_trigger" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_profiles_updated_at"();



CREATE OR REPLACE TRIGGER "update_properties_updated_at_trigger" BEFORE UPDATE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."update_properties_updated_at"();



CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at_trigger" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_subscriptions_updated_at"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credits"
    ADD CONSTRAINT "credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitation_tokens"
    ADD CONSTRAINT "invitation_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invitation_tokens"
    ADD CONSTRAINT "invitation_tokens_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_drafts"
    ADD CONSTRAINT "property_drafts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_drafts"
    ADD CONSTRAINT "property_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_generation_jobs"
    ADD CONSTRAINT "video_generation_jobs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_generation_jobs"
    ADD CONSTRAINT "video_generation_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage all drafts" ON "public"."property_drafts" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage all video jobs" ON "public"."video_generation_jobs" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Users can delete own drafts" ON "public"."property_drafts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own drafts" ON "public"."property_drafts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own video jobs" ON "public"."video_generation_jobs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own drafts" ON "public"."property_drafts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own video jobs" ON "public"."video_generation_jobs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own drafts" ON "public"."property_drafts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own video jobs" ON "public"."video_generation_jobs" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_insert_system" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "audit_logs_select_admin" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



ALTER TABLE "public"."credit_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credit_transactions_delete_admin_only" ON "public"."credit_transactions" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "credit_transactions_insert_admin_only" ON "public"."credit_transactions" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "credit_transactions_select_admin" ON "public"."credit_transactions" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "credit_transactions_select_own" ON "public"."credit_transactions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."credits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credits_insert_own" ON "public"."credits" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "credits_select_admin" ON "public"."credits" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "credits_select_own" ON "public"."credits" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "credits_update_admin_only" ON "public"."credits" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



ALTER TABLE "public"."invitation_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitation_tokens_delete_admin" ON "public"."invitation_tokens" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "invitation_tokens_insert_admin" ON "public"."invitation_tokens" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "invitation_tokens_select_admin" ON "public"."invitation_tokens" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "invitation_tokens_update_admin" ON "public"."invitation_tokens" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_admin_only" ON "public"."profiles" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_public_or_own_or_admin" ON "public"."profiles" FOR SELECT USING ((("is_visible" = true) OR ("auth"."uid"() = "id") OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "profiles_update_own_or_admin" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "id") OR "public"."has_role"("auth"."uid"(), 'admin'::"text"))) WITH CHECK ((("auth"."uid"() = "id") OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "properties_delete_own_or_admin" ON "public"."properties" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "properties_insert_own" ON "public"."properties" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "properties_select_admin" ON "public"."properties" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "properties_select_own" ON "public"."properties" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "properties_select_public_active_with_subscription" ON "public"."properties" FOR SELECT USING ((("status" = 'active'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "properties"."user_id") AND ("p"."is_visible" = true) AND "public"."has_active_subscription"("p"."id"))))));



CREATE POLICY "properties_update_own_or_admin" ON "public"."properties" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



ALTER TABLE "public"."property_drafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions_delete_admin_only" ON "public"."subscriptions" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "subscriptions_insert_own" ON "public"."subscriptions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "subscriptions_select_admin" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "subscriptions_select_own" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "subscriptions_update_admin_only" ON "public"."subscriptions" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_delete_admin_only" ON "public"."user_roles" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "user_roles_insert_own_agent_or_admin" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK (((("auth"."uid"() = "user_id") AND ("role" = 'agent'::"text")) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "user_roles_select_admin" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "user_roles_select_own" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_roles_update_admin_only" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



ALTER TABLE "public"."video_generation_jobs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."credits";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."video_generation_jobs";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."add_credits"("p_user_id" "uuid", "p_amount" integer, "p_product" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_credits"("p_user_id" "uuid", "p_amount" integer, "p_product" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_credits"("p_user_id" "uuid", "p_amount" integer, "p_product" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_property_drafts"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_property_drafts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_property_drafts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."deduct_credits"("p_user_id" "uuid", "p_amount" integer, "p_product" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."deduct_credits"("p_user_id" "uuid", "p_amount" integer, "p_product" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deduct_credits"("p_user_id" "uuid", "p_amount" integer, "p_product" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_property_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_property_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_property_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agent_dashboard_stats"("agent_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_agent_dashboard_stats"("agent_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agent_dashboard_stats"("agent_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_subscription_status"("check_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_subscription_status"("check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_subscription_status"("check_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_supabase_url"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_supabase_url"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_supabase_url"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_credits"("check_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_credits"("check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_credits"("check_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_active_subscription"("check_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_active_subscription"("check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_active_subscription"("check_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("check_user_id" "uuid", "check_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("check_user_id" "uuid", "check_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("check_user_id" "uuid", "check_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_cleanup_draft_files"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_draft_files"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_draft_files"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_cleanup_property_files"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_property_files"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_property_files"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_cleanup_user_files"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_user_files"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_user_files"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_cleanup_video_job_files"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_video_job_files"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_video_job_files"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_credits_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_credits_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_credits_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_profiles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_profiles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_profiles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_properties_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_properties_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_properties_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_property_drafts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_property_drafts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_property_drafts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subscriptions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subscriptions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subscriptions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tasks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tasks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tasks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_video_generation_jobs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_video_generation_jobs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_video_generation_jobs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."use_invitation_token"("invite_token" "text", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."use_invitation_token"("invite_token" "text", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."use_invitation_token"("invite_token" "text", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_invitation_token"("invite_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invitation_token"("invite_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invitation_token"("invite_token" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."credit_transactions" TO "anon";
GRANT ALL ON TABLE "public"."credit_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."credits" TO "anon";
GRANT ALL ON TABLE "public"."credits" TO "authenticated";
GRANT ALL ON TABLE "public"."credits" TO "service_role";



GRANT ALL ON TABLE "public"."invitation_tokens" TO "anon";
GRANT ALL ON TABLE "public"."invitation_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."invitation_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."properties" TO "anon";
GRANT ALL ON TABLE "public"."properties" TO "authenticated";
GRANT ALL ON TABLE "public"."properties" TO "service_role";



GRANT ALL ON TABLE "public"."property_drafts" TO "anon";
GRANT ALL ON TABLE "public"."property_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."property_drafts" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."video_generation_jobs" TO "anon";
GRANT ALL ON TABLE "public"."video_generation_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."video_generation_jobs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Authenticated users can delete property images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'properties'::text));



  create policy "Authenticated users can update property images"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'properties'::text))
with check ((bucket_id = 'properties'::text));



  create policy "Authenticated users can upload property images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'properties'::text));



  create policy "Public can view property images"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'properties'::text));



  create policy "Service role has full access to jobs"
  on "storage"."objects"
  as permissive
  for all
  to service_role
using ((bucket_id = 'jobs'::text))
with check ((bucket_id = 'jobs'::text));



  create policy "Users can delete own job files"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'jobs'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can read own job files"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'jobs'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can update own job files"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'jobs'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
with check (((bucket_id = 'jobs'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload to own job folder"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'jobs'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



