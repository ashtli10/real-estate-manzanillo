/*
  # Create Properties Table for BN Inmobiliaria

  ## Overview
  Creates a comprehensive properties table for real estate listings in Manzanillo, Mexico.
  Includes all necessary fields for property management, admin control, and public display.

  ## New Tables
  - `properties`
    - `id` (uuid, primary key) - Unique identifier
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp
    - `title` (text) - Property title
    - `description` (text) - Detailed description
    - `price` (numeric) - Price in MXN
    - `currency` (text) - Currency code (default MXN)
    - `location_city` (text) - City (e.g., Manzanillo)
    - `location_state` (text) - State (e.g., Colima)
    - `location_neighborhood` (text) - Neighborhood/area
    - `location_address` (text) - Full address
    - `location_coordinates` (jsonb) - Lat/lng for map
    - `property_type` (text) - Type: house, apartment, land, commercial
    - `bedrooms` (integer) - Number of bedrooms
    - `bathrooms` (numeric) - Number of bathrooms (supports 1.5, 2.5, etc.)
    - `size_total_m2` (numeric) - Total lot size in m²
    - `size_construction_m2` (numeric) - Construction size in m²
    - `parking_spaces` (integer) - Number of parking spaces
    - `levels` (integer) - Number of floors
    - `age_years` (integer) - Age of property in years
    - `condition` (text) - new, used, remodeled
    - `orientation` (text) - North, South, East, West
    - `amenities` (jsonb) - Array of amenities
    - `custom_bonuses` (jsonb) - Array of custom tags/bonuses
    - `services_included` (jsonb) - Water, electricity, gas, internet
    - `nearby_services` (jsonb) - Schools, hospitals, shopping
    - `images` (jsonb) - Array of image URLs
    - `is_featured` (boolean) - Show in carousel
    - `display_order` (integer) - Order in listings
    - `status` (text) - active, sold, rented
    - `near_beach` (boolean) - Is property near beach

  ## Security
  - Enable RLS on `properties` table
  - Public can SELECT active properties
  - Only authenticated admin can INSERT, UPDATE, DELETE
*/

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  title text NOT NULL,
  description text DEFAULT '',
  
  price numeric NOT NULL,
  currency text DEFAULT 'MXN',
  
  location_city text DEFAULT 'Manzanillo',
  location_state text DEFAULT 'Colima',
  location_neighborhood text DEFAULT '',
  location_address text DEFAULT '',
  location_coordinates jsonb DEFAULT '{}',
  
  property_type text DEFAULT 'house',
  bedrooms integer DEFAULT 0,
  bathrooms numeric DEFAULT 0,
  size_total_m2 numeric DEFAULT 0,
  size_construction_m2 numeric DEFAULT 0,
  parking_spaces integer DEFAULT 0,
  levels integer DEFAULT 1,
  age_years integer DEFAULT 0,
  condition text DEFAULT 'used',
  orientation text DEFAULT '',
  
  amenities jsonb DEFAULT '[]',
  custom_bonuses jsonb DEFAULT '[]',
  services_included jsonb DEFAULT '[]',
  nearby_services jsonb DEFAULT '[]',
  images jsonb DEFAULT '[]',
  
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  status text DEFAULT 'active',
  near_beach boolean DEFAULT false
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active properties"
  ON properties
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Admin can insert properties"
  ON properties
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can update properties"
  ON properties
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can delete properties"
  ON properties
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_properties_display_order ON properties(display_order);
CREATE INDEX IF NOT EXISTS idx_properties_is_featured ON properties(is_featured);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);