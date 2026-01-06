-- Migration: Fix cron job authentication
-- 
-- Updates the storage-maintenance cron job to use vault for the service role key

-- Remove the previous cron job
SELECT cron.unschedule('storage-maintenance-daily');

-- Create a helper function to get the service role key from vault
CREATE OR REPLACE FUNCTION get_maintenance_service_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key'
  LIMIT 1;
  
  RETURN secret_value;
END;
$$;

-- Create a function that the cron job will call
CREATE OR REPLACE FUNCTION run_storage_maintenance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_key TEXT;
  base_url TEXT := 'https://vvvscafjvisaswpqhnvy.supabase.co';
BEGIN
  -- Get service role key from vault
  service_key := get_maintenance_service_key();
  
  IF service_key IS NULL THEN
    RAISE WARNING 'Storage maintenance: service role key not found in vault';
    RETURN;
  END IF;
  
  -- Call the storage-maintenance Edge Function
  PERFORM net.http_post(
    url := base_url || '/functions/v1/storage-maintenance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
  
  RAISE NOTICE 'Storage maintenance job triggered successfully';
END;
$$;

-- Schedule the maintenance job to run daily at 3:00 AM UTC
SELECT cron.schedule(
  'storage-maintenance-daily',
  '0 3 * * *',
  'SELECT run_storage_maintenance()'
);

COMMENT ON FUNCTION run_storage_maintenance() IS 'Triggers storage-maintenance Edge Function to clean orphaned R2 files';
