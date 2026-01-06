-- Migration: Add pre_allocated_property_id to drafts and fix storage cleanup triggers
-- 
-- This migration:
-- 1. Adds pre_allocated_property_id column to property_drafts for stable upload paths
-- 2. Fixes the storage cleanup triggers to use service role key from vault
-- 
-- MANUAL STEP REQUIRED AFTER MIGRATION:
-- Run this SQL in Supabase SQL Editor to add secrets to vault:
--
-- INSERT INTO vault.secrets (name, secret) VALUES 
--   ('supabase_url', 'https://YOUR_PROJECT_REF.supabase.co'),
--   ('supabase_service_role_key', 'YOUR_SERVICE_ROLE_KEY');
--
-- Or update if they exist:
-- UPDATE vault.secrets SET secret = 'YOUR_VALUE' WHERE name = 'supabase_url';
-- UPDATE vault.secrets SET secret = 'YOUR_VALUE' WHERE name = 'supabase_service_role_key';

-- ============================================================================
-- PART 1: Add pre_allocated_property_id to property_drafts
-- ============================================================================

-- Add column to store pre-allocated UUID for new properties
ALTER TABLE public.property_drafts 
ADD COLUMN IF NOT EXISTS pre_allocated_property_id UUID;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.property_drafts.pre_allocated_property_id IS 
'Pre-allocated UUID for new properties. Generated when draft is created, used for R2 upload paths so files are stored in final location from the start. Used as the property ID when inserting new property.';

-- ============================================================================
-- PART 2: Create helper function to get service role key from vault
-- ============================================================================

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
  WHERE name = 'supabase_service_role_key';
  RETURN key;
END;
$$;

COMMENT ON FUNCTION public.get_service_role_key() IS 
'Retrieves Supabase service role key from vault for authenticated Edge Function calls';

-- ============================================================================
-- PART 3: Update trigger functions to use service role key
-- ============================================================================

-- Update trigger_cleanup_draft_files
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

  -- Get configuration from vault
  base_url := public.get_supabase_url();
  service_key := public.get_service_role_key();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for draft %', OLD.id;
    RETURN OLD;
  END IF;
  
  IF service_key IS NULL THEN
    RAISE WARNING 'supabase_service_role_key not found in vault - skipping R2 cleanup for draft %', OLD.id;
    RETURN OLD;
  END IF;

  -- Call Edge Function with service role key
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
      'files', to_jsonb(OLD.uploaded_files)
    ),
    timeout_milliseconds := 30000
  );
  
  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.trigger_cleanup_draft_files() IS 
'Trigger function to clean up uploaded files when a property draft is deleted';

-- Update trigger_cleanup_property_files
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
  -- Get configuration from vault
  base_url := public.get_supabase_url();
  service_key := public.get_service_role_key();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for property %', OLD.id;
    RETURN OLD;
  END IF;
  
  IF service_key IS NULL THEN
    RAISE WARNING 'supabase_service_role_key not found in vault - skipping R2 cleanup for property %', OLD.id;
    RETURN OLD;
  END IF;

  -- Call Edge Function with service role key
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

COMMENT ON FUNCTION public.trigger_cleanup_property_files() IS 
'Trigger function to clean up R2 storage when a property is deleted';

-- Update trigger_cleanup_user_files
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
  -- Get configuration from vault
  base_url := public.get_supabase_url();
  service_key := public.get_service_role_key();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for user %', OLD.id;
    RETURN OLD;
  END IF;
  
  IF service_key IS NULL THEN
    RAISE WARNING 'supabase_service_role_key not found in vault - skipping R2 cleanup for user %', OLD.id;
    RETURN OLD;
  END IF;

  -- Call Edge Function with service role key
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

COMMENT ON FUNCTION public.trigger_cleanup_user_files() IS 
'Trigger function to clean up all R2 storage when a user profile is deleted';

-- Update trigger_cleanup_video_job_files
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
  -- Get configuration from vault
  base_url := public.get_supabase_url();
  service_key := public.get_service_role_key();
  
  IF base_url IS NULL THEN
    RAISE WARNING 'supabase_url not found in vault - skipping R2 cleanup for video job %', OLD.id;
    RETURN OLD;
  END IF;
  
  IF service_key IS NULL THEN
    RAISE WARNING 'supabase_service_role_key not found in vault - skipping R2 cleanup for video job %', OLD.id;
    RETURN OLD;
  END IF;

  -- Call Edge Function with service role key
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

COMMENT ON FUNCTION public.trigger_cleanup_video_job_files() IS 
'Trigger function to clean up R2 storage when a video generation job is deleted';
