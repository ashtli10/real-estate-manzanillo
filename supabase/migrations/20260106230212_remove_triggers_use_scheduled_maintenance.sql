-- Migration: Remove storage cleanup triggers, use scheduled maintenance instead
-- 
-- This migration removes the on-delete triggers that called storage-cleanup Edge Function.
-- Instead, orphaned files are cleaned up by the storage-maintenance function running on a schedule.
-- 
-- Benefits:
-- - Simpler architecture (no pg_net, no vault secrets in triggers)
-- - Handles race conditions with async media processing (ffmpeg)
-- - More reliable cleanup (retries on failure)
-- - Easier debugging and monitoring

-- ============================================================================
-- Drop all storage cleanup triggers
-- ============================================================================

DROP TRIGGER IF EXISTS on_property_delete ON properties;
DROP TRIGGER IF EXISTS on_video_job_delete ON video_generation_jobs;
DROP TRIGGER IF EXISTS on_user_delete ON profiles;
DROP TRIGGER IF EXISTS on_draft_delete ON property_drafts;

-- ============================================================================
-- Drop all trigger functions for storage cleanup
-- ============================================================================

DROP FUNCTION IF EXISTS notify_storage_cleanup_on_property_delete() CASCADE;
DROP FUNCTION IF EXISTS notify_storage_cleanup_on_video_job_delete() CASCADE;
DROP FUNCTION IF EXISTS notify_storage_cleanup_on_user_delete() CASCADE;
DROP FUNCTION IF EXISTS notify_storage_cleanup_on_draft_delete() CASCADE;

-- Also drop old function names if they exist
DROP FUNCTION IF EXISTS trigger_storage_cleanup_on_property_delete() CASCADE;
DROP FUNCTION IF EXISTS trigger_storage_cleanup_on_video_job_delete() CASCADE;
DROP FUNCTION IF EXISTS trigger_storage_cleanup_on_user_delete() CASCADE;
DROP FUNCTION IF EXISTS trigger_storage_cleanup_on_draft_delete() CASCADE;

-- ============================================================================
-- Drop the vault helper function (no longer needed)
-- ============================================================================

DROP FUNCTION IF EXISTS get_service_role_key() CASCADE;

-- ============================================================================
-- Enable pg_cron extension for scheduled jobs
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================================================
-- Create scheduled job to run storage-maintenance every 24 hours
-- ============================================================================

-- First, remove any existing job with the same name
SELECT cron.unschedule('storage-maintenance-daily') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'storage-maintenance-daily');

-- Schedule storage-maintenance to run daily at 3:00 AM UTC
-- The job calls the Edge Function via pg_net
SELECT cron.schedule(
  'storage-maintenance-daily',
  '0 3 * * *',  -- Every day at 3:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://vvvscafjvisaswpqhnvy.supabase.co/functions/v1/storage-maintenance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- Store the service role key in app settings for the cron job
-- Note: This needs to be set via Supabase Dashboard > Database > Settings
-- or via: ALTER DATABASE postgres SET app.settings.service_role_key = 'your-key';
-- ============================================================================

COMMENT ON EXTENSION pg_cron IS 'Storage maintenance runs daily at 3:00 AM UTC via storage-maintenance Edge Function';
