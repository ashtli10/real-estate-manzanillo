-- Drop unused legacy columns from properties
alter table public.properties
  drop column if exists bedrooms,
  drop column if exists bathrooms,
  drop column if exists size_total_m2,
  drop column if exists size_construction_m2,
  drop column if exists parking_spaces,
  drop column if exists levels,
  drop column if exists age_years,
  drop column if exists orientation,
  drop column if exists amenities,
  drop column if exists nearby_services,
  drop column if exists services_included;
