-- Phase 1 foundation schema
-- Decision: profiles.id is the application identity; auth_user_id is the
-- unique FK to auth.users (source of truth for authentication).

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('admin', 'agent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_type as enum (
    'house', 'apartment', 'condo', 'townhouse', 'land', 'commercial'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_status as enum (
    'draft', 'available', 'pending', 'sold', 'off_market'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lead_source as enum (
    'website', 'chatbot', 'referral', 'manual', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lead_status as enum (
    'new', 'qualifying', 'qualified', 'nurturing',
    'appointment_set', 'closed', 'lost'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lead_intent as enum ('buy', 'rent', 'sell', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_role as enum ('user', 'assistant', 'system', 'agent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_status as enum (
    'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.email_event_type as enum (
    'welcome', 'follow_up', 'appointment_reminder', 'nurture'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.email_event_status as enum (
    'queued', 'sent', 'failed', 'opened', 'clicked'
  );
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.user_role not null default 'agent',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_check check (char_length(trim(full_name)) > 0)
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  property_type public.property_type not null default 'house',
  status public.property_status not null default 'available',
  price numeric(12, 2) not null default 0 check (price >= 0),
  city text not null,
  state text not null,
  address text not null,
  bedrooms integer check (bedrooms is null or bedrooms >= 0),
  bathrooms numeric(4, 1) check (bathrooms is null or bathrooms >= 0),
  area_sqft integer check (area_sqft is null or area_sqft >= 0),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  source public.lead_source not null default 'website',
  status public.lead_status not null default 'new',
  intent public.lead_intent not null default 'unknown',
  city text,
  property_type public.property_type,
  budget_min numeric(12, 2) check (budget_min is null or budget_min >= 0),
  budget_max numeric(12, 2) check (budget_max is null or budget_max >= 0),
  bedrooms integer check (bedrooms is null or bedrooms >= 0),
  timeline text,
  lead_score integer check (lead_score is null or (lead_score >= 0 and lead_score <= 100)),
  assigned_agent_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_budget_range_check check (
    budget_min is null or budget_max is null or budget_max >= budget_min
  )
);

create table if not exists public.lead_conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.lead_conversations (id) on delete cascade,
  role public.message_role not null,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  agent_id uuid not null references public.profiles (id) on delete restrict,
  scheduled_at timestamptz not null,
  status public.appointment_status not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  event_type public.email_event_type not null,
  status public.email_event_status not null default 'queued',
  recipient text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists leads_assigned_agent_idx on public.leads (assigned_agent_id);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_email_idx on public.leads (email);
create index if not exists properties_city_idx on public.properties (city);
create index if not exists appointments_agent_idx on public.appointments (agent_id);
create index if not exists appointments_lead_idx on public.appointments (lead_id);
create index if not exists appointments_scheduled_idx on public.appointments (scheduled_at);
create index if not exists lead_conversations_lead_idx on public.lead_conversations (lead_id);
create index if not exists lead_messages_conversation_idx on public.lead_messages (conversation_id);
create index if not exists email_events_lead_idx on public.email_events (lead_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
before update on public.properties
for each row execute procedure public.set_updated_at();

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute procedure public.set_updated_at();

drop trigger if exists lead_conversations_set_updated_at on public.lead_conversations;
create trigger lead_conversations_set_updated_at
before update on public.lead_conversations
for each row execute procedure public.set_updated_at();

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
before update on public.appointments
for each row execute procedure public.set_updated_at();

-- Always create profiles as agent. Promote admins via SQL / seed (never via client metadata).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    'agent'
  )
  on conflict (auth_user_id) do update
    set email = excluded.email,
        full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for the service role, which is how seed/admin jobs promote users.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Role changes are not permitted';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
before update on public.profiles
for each row execute procedure public.prevent_profile_role_escalation();

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.leads enable row level security;
alter table public.lead_conversations enable row level security;
alter table public.lead_messages enable row level security;
alter table public.appointments enable row level security;
alter table public.email_events enable row level security;

-- Profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
on public.profiles for select
to authenticated
using (auth_user_id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update
to authenticated
using (auth_user_id = auth.uid() or public.is_admin())
with check (auth_user_id = auth.uid() or public.is_admin());

-- Properties: listings are readable by signed-in staff; writes are admin-only.
-- Anonymous read is deferred to Phase 2 (public landing).
drop policy if exists "properties_select_authenticated" on public.properties;
create policy "properties_select_authenticated"
on public.properties for select
to authenticated
using (true);

drop policy if exists "properties_admin_write" on public.properties;
create policy "properties_admin_write"
on public.properties for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Leads
drop policy if exists "leads_select" on public.leads;
create policy "leads_select"
on public.leads for select
to authenticated
using (public.is_admin() or assigned_agent_id = public.current_profile_id());

drop policy if exists "leads_insert_admin" on public.leads;
create policy "leads_insert_admin"
on public.leads for insert
to authenticated
with check (public.is_admin());

drop policy if exists "leads_update" on public.leads;
create policy "leads_update"
on public.leads for update
to authenticated
using (public.is_admin() or assigned_agent_id = public.current_profile_id())
with check (public.is_admin() or assigned_agent_id = public.current_profile_id());

drop policy if exists "leads_delete_admin" on public.leads;
create policy "leads_delete_admin"
on public.leads for delete
to authenticated
using (public.is_admin());

-- Conversations follow parent lead access
drop policy if exists "conversations_select" on public.lead_conversations;
create policy "conversations_select"
on public.lead_conversations for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.leads l
    where l.id = lead_id
      and l.assigned_agent_id = public.current_profile_id()
  )
);

drop policy if exists "conversations_write" on public.lead_conversations;
create policy "conversations_write"
on public.lead_conversations for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.leads l
    where l.id = lead_id
      and l.assigned_agent_id = public.current_profile_id()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.leads l
    where l.id = lead_id
      and l.assigned_agent_id = public.current_profile_id()
  )
);

drop policy if exists "messages_select" on public.lead_messages;
create policy "messages_select"
on public.lead_messages for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.lead_conversations c
    join public.leads l on l.id = c.lead_id
    where c.id = conversation_id
      and l.assigned_agent_id = public.current_profile_id()
  )
);

drop policy if exists "messages_write" on public.lead_messages;
create policy "messages_write"
on public.lead_messages for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.lead_conversations c
    join public.leads l on l.id = c.lead_id
    where c.id = conversation_id
      and l.assigned_agent_id = public.current_profile_id()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.lead_conversations c
    join public.leads l on l.id = c.lead_id
    where c.id = conversation_id
      and l.assigned_agent_id = public.current_profile_id()
  )
);

drop policy if exists "appointments_select" on public.appointments;
create policy "appointments_select"
on public.appointments for select
to authenticated
using (public.is_admin() or agent_id = public.current_profile_id());

drop policy if exists "appointments_write" on public.appointments;
create policy "appointments_write"
on public.appointments for all
to authenticated
using (public.is_admin() or agent_id = public.current_profile_id())
with check (public.is_admin() or agent_id = public.current_profile_id());

drop policy if exists "email_events_select" on public.email_events;
create policy "email_events_select"
on public.email_events for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.leads l
    where l.id = lead_id
      and l.assigned_agent_id = public.current_profile_id()
  )
);

drop policy if exists "email_events_admin_write" on public.email_events;
create policy "email_events_admin_write"
on public.email_events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
