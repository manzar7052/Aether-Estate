-- Phase 4A migration: Lead Qualification Engine Schema Updates
-- 1. Add qualification_category text check ('hot', 'warm', 'cold')
-- 2. Add qualification_breakdown jsonb
-- 3. Add qualification_reasons text[]
-- 4. Add qualified_at timestamptz
-- 5. Add indices for lead_score and qualification_category

alter table public.leads
  add column if not exists qualification_category text check (qualification_category in ('hot', 'warm', 'cold')),
  add column if not exists qualification_breakdown jsonb not null default '{}',
  add column if not exists qualification_reasons text[] not null default '{}',
  add column if not exists qualified_at timestamptz;

-- Indices for CRM filtering and leaderboards
create index if not exists leads_lead_score_idx on public.leads (lead_score desc);
create index if not exists leads_qualification_category_idx on public.leads (qualification_category);
create index if not exists leads_qualified_at_idx on public.leads (qualified_at desc);
