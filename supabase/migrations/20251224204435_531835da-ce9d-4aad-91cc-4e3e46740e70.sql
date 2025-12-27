-- Add show_map column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS show_map boolean DEFAULT true;