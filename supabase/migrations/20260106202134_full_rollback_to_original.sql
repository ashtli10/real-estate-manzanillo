-- FULL ROLLBACK: Restore everything to original state before any auth changes
-- Drops all helper functions and restores original trigger functions

-- Drop all helper functions created during the session
DROP FUNCTION IF EXISTS public.get_service_role_key();
DROP FUNCTION IF EXISTS public.get_jwt_secret();
DROP FUNCTION IF EXISTS public.generate_service_jwt();
DROP FUNCTION IF EXISTS public.get_cleanup_secret();

-- Restore original trigger functions from 20260106175641_remote_schema.sql

CREATE OR REPLACE FUNCTION public.trigger_cleanup_draft_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

COMMENT ON FUNCTION public.trigger_cleanup_draft_files() IS 'Trigger function to clean up uploaded files when a property draft is deleted';

CREATE OR REPLACE FUNCTION public.trigger_cleanup_property_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  base_url TEXT;
BEGIN
  base_url := public.get_supabase_url();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for property %', OLD.id;
    RETURN OLD;
  END IF;

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

COMMENT ON FUNCTION public.trigger_cleanup_property_files() IS 'Trigger function to clean up R2 storage when a property is deleted';

CREATE OR REPLACE FUNCTION public.trigger_cleanup_user_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

COMMENT ON FUNCTION public.trigger_cleanup_user_files() IS 'Trigger function to clean up all R2 storage when a user profile is deleted';

CREATE OR REPLACE FUNCTION public.trigger_cleanup_video_job_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

COMMENT ON FUNCTION public.trigger_cleanup_video_job_files() IS 'Trigger function to clean up R2 storage when a video generation job is deleted';
