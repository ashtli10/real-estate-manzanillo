-- Use pgjwt to create proper signed JWTs for Edge Function calls
-- This allows deploying Edge Functions WITHOUT --no-verify-jwt
-- Supabase will automatically verify the JWT signature

-- Enable pgjwt extension (should already be available in Supabase)
CREATE EXTENSION IF NOT EXISTS pgjwt WITH SCHEMA extensions;

-- Helper function to get JWT secret from vault
-- NOTE: You must add the JWT secret to vault:
-- INSERT INTO vault.secrets (name, secret) VALUES ('jwt_secret', 'your-jwt-secret-here');
-- Get it from: Supabase Dashboard → Settings → API → JWT Secret
CREATE OR REPLACE FUNCTION public.get_jwt_secret()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  secret TEXT;
BEGIN
  SELECT decrypted_secret INTO secret
  FROM vault.decrypted_secrets
  WHERE name = 'jwt_secret'
  LIMIT 1;
  
  RETURN secret;
END;
$$;

COMMENT ON FUNCTION public.get_jwt_secret() IS 'Retrieves the JWT signing secret from vault';

-- Helper function to generate a service role JWT
-- Creates a short-lived (60 second) JWT with service_role claim
CREATE OR REPLACE FUNCTION public.generate_service_jwt()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  jwt_secret TEXT;
  token TEXT;
  now_epoch BIGINT;
BEGIN
  jwt_secret := public.get_jwt_secret();
  
  IF jwt_secret IS NULL THEN
    RETURN NULL;
  END IF;
  
  now_epoch := EXTRACT(EPOCH FROM now())::BIGINT;
  
  -- Create a service_role JWT valid for 60 seconds
  token := extensions.sign(
    json_build_object(
      'role', 'service_role',
      'iss', 'supabase',
      'iat', now_epoch,
      'exp', now_epoch + 60  -- 60 second expiry
    )::json,
    jwt_secret,
    'HS256'
  );
  
  RETURN token;
END;
$$;

COMMENT ON FUNCTION public.generate_service_jwt() IS 'Generates a short-lived service role JWT for internal API calls';

-- Drop the old helper function
DROP FUNCTION IF EXISTS public.get_service_role_key();

-- Update trigger_cleanup_draft_files with proper signed JWT
CREATE OR REPLACE FUNCTION public.trigger_cleanup_draft_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  base_url TEXT;
  jwt_token TEXT;
BEGIN
  -- Skip if no files to clean up
  IF OLD.uploaded_files IS NULL OR array_length(OLD.uploaded_files, 1) IS NULL THEN
    RETURN OLD;
  END IF;

  base_url := public.get_supabase_url();
  jwt_token := public.generate_service_jwt();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for draft %', OLD.id;
    RETURN OLD;
  END IF;

  IF jwt_token IS NULL THEN
    RAISE WARNING 'jwt_secret not found in vault - skipping R2 cleanup for draft %', OLD.id;
    RETURN OLD;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || jwt_token
    ),
    body := jsonb_build_object(
      'type', 'draft',
      'user_id', OLD.user_id::text,
      'entity_id', OLD.id::text,
      'uploaded_files', to_jsonb(OLD.uploaded_files)
    ),
    timeout_milliseconds := 30000
  );
  
  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.trigger_cleanup_draft_files() IS 'Trigger function to clean up uploaded files when a property draft is deleted';

-- Update trigger_cleanup_property_files with proper signed JWT
CREATE OR REPLACE FUNCTION public.trigger_cleanup_property_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  base_url TEXT;
  jwt_token TEXT;
BEGIN
  base_url := public.get_supabase_url();
  jwt_token := public.generate_service_jwt();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for property %', OLD.id;
    RETURN OLD;
  END IF;

  IF jwt_token IS NULL THEN
    RAISE WARNING 'jwt_secret not found in vault - skipping R2 cleanup for property %', OLD.id;
    RETURN OLD;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || jwt_token
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

COMMENT ON FUNCTION public.trigger_cleanup_property_files() IS 'Trigger function to clean up R2 storage when a property is deleted';

-- Update trigger_cleanup_user_files with proper signed JWT
CREATE OR REPLACE FUNCTION public.trigger_cleanup_user_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  base_url TEXT;
  jwt_token TEXT;
BEGIN
  base_url := public.get_supabase_url();
  jwt_token := public.generate_service_jwt();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for user %', OLD.id;
    RETURN OLD;
  END IF;

  IF jwt_token IS NULL THEN
    RAISE WARNING 'jwt_secret not found in vault - skipping R2 cleanup for user %', OLD.id;
    RETURN OLD;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || jwt_token
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

COMMENT ON FUNCTION public.trigger_cleanup_user_files() IS 'Trigger function to clean up all R2 storage when a user profile is deleted';

-- Update trigger_cleanup_video_job_files with proper signed JWT
CREATE OR REPLACE FUNCTION public.trigger_cleanup_video_job_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  base_url TEXT;
  jwt_token TEXT;
BEGIN
  base_url := public.get_supabase_url();
  jwt_token := public.generate_service_jwt();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for video job %', OLD.id;
    RETURN OLD;
  END IF;

  IF jwt_token IS NULL THEN
    RAISE WARNING 'jwt_secret not found in vault - skipping R2 cleanup for video job %', OLD.id;
    RETURN OLD;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || jwt_token
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

COMMENT ON FUNCTION public.trigger_cleanup_video_job_files() IS 'Trigger function to clean up R2 storage when a video generation job is deleted';
