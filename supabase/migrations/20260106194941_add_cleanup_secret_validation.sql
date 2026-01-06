-- Add service role key to vault and update triggers to use JWT auth
-- This allows us to deploy Edge Functions WITHOUT --no-verify-jwt flag
-- Supabase's built-in JWT verification handles security automatically

-- First, create a helper function to get the service role key from vault
CREATE OR REPLACE FUNCTION public.get_service_role_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  key TEXT;
BEGIN
  SELECT decrypted_secret INTO key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;
  
  RETURN key;
END;
$$;

COMMENT ON FUNCTION public.get_service_role_key() IS 'Retrieves the Supabase service role key from vault for internal API calls';

-- Update trigger_cleanup_draft_files with proper JWT auth
CREATE OR REPLACE FUNCTION public.trigger_cleanup_draft_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  base_url TEXT;
  service_key TEXT;
BEGIN
  -- Skip if no files to clean up
  IF OLD.uploaded_files IS NULL OR array_length(OLD.uploaded_files, 1) IS NULL THEN
    RETURN OLD;
  END IF;

  base_url := public.get_supabase_url();
  service_key := public.get_service_role_key();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for draft %', OLD.id;
    RETURN OLD;
  END IF;

  IF service_key IS NULL THEN
    RAISE WARNING 'service_role_key not found in vault - skipping R2 cleanup for draft %', OLD.id;
    RETURN OLD;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
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

-- Update trigger_cleanup_property_files with proper JWT auth
CREATE OR REPLACE FUNCTION public.trigger_cleanup_property_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  base_url TEXT;
  service_key TEXT;
BEGIN
  base_url := public.get_supabase_url();
  service_key := public.get_service_role_key();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for property %', OLD.id;
    RETURN OLD;
  END IF;

  IF service_key IS NULL THEN
    RAISE WARNING 'service_role_key not found in vault - skipping R2 cleanup for property %', OLD.id;
    RETURN OLD;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
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

-- Update trigger_cleanup_user_files with proper JWT auth
CREATE OR REPLACE FUNCTION public.trigger_cleanup_user_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  base_url TEXT;
  service_key TEXT;
BEGIN
  base_url := public.get_supabase_url();
  service_key := public.get_service_role_key();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for user %', OLD.id;
    RETURN OLD;
  END IF;

  IF service_key IS NULL THEN
    RAISE WARNING 'service_role_key not found in vault - skipping R2 cleanup for user %', OLD.id;
    RETURN OLD;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
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

-- Update trigger_cleanup_video_job_files with proper JWT auth
CREATE OR REPLACE FUNCTION public.trigger_cleanup_video_job_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  base_url TEXT;
  service_key TEXT;
BEGIN
  base_url := public.get_supabase_url();
  service_key := public.get_service_role_key();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for video job %', OLD.id;
    RETURN OLD;
  END IF;

  IF service_key IS NULL THEN
    RAISE WARNING 'service_role_key not found in vault - skipping R2 cleanup for video job %', OLD.id;
    RETURN OLD;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
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
