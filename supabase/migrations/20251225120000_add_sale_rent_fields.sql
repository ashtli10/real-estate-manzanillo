alter table public.properties
  add column if not exists is_for_sale boolean not null default true,
  add column if not exists is_for_rent boolean not null default false,
  add column if not exists rent_price numeric,
  add column if not exists rent_currency text default 'MXN';

-- allow sale price to be optional when property is only for rent
alter table public.properties
  alter column price drop not null;
