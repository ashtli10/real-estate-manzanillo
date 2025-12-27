-- Add missing media column for property videos
alter table public.properties
  add column if not exists videos jsonb default '[]'::jsonb;

-- Normalize existing rows so videos is always an array
update public.properties
set videos = coalesce(videos, '[]'::jsonb);
