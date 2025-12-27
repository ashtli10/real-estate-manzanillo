-- Add characteristics column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS characteristics jsonb DEFAULT '[]'::jsonb;