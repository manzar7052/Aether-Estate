-- Phase 2 migration: Public property browsing and lead capture
-- 1. Extend lead_source enum with 'property_page'
-- 2. Add images and features arrays to public.properties
-- 3. Add property_id FK and message to public.leads
-- 4. Enable public (anon) read on active properties and insert on new leads

-- Top-level enum extension
alter type public.lead_source add value if not exists 'property_page';

-- Properties multi-image and feature tags support
alter table public.properties
  add column if not exists images text[] not null default '{}',
  add column if not exists features text[] not null default '{}';

-- Lead property inquiry association and message note
alter table public.leads
  add column if not exists property_id uuid references public.properties (id) on delete set null,
  add column if not exists message text;

create index if not exists leads_property_id_idx on public.leads (property_id);
create index if not exists properties_status_idx on public.properties (status);
create index if not exists properties_price_idx on public.properties (price);
create index if not exists properties_property_type_idx on public.properties (property_type);

-- RLS: Public reading of properties
-- Replace staff-only policy with public read for non-draft properties
drop policy if exists "properties_select_authenticated" on public.properties;
drop policy if exists "properties_select_public" on public.properties;

create policy "properties_select_public"
on public.properties for select
to anon, authenticated
using (
  status <> 'draft'
  or public.is_admin()
);

-- RLS: Public lead submission from website / property pages
drop policy if exists "leads_insert_public" on public.leads;

create policy "leads_insert_public"
on public.leads for insert
to anon, authenticated
with check (
  source::text in ('website', 'property_page', 'chatbot')
  and status = 'new'
);

-- Grant appropriate permissions
grant select on public.properties to anon, authenticated;
grant insert on public.leads to anon, authenticated;
