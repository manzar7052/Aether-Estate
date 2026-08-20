-- Phase 5A Migration: Appointment Availability & Booking Engine
-- Extends the existing public.appointments table with duration, type, and conflict protection.

-- 1. Enable btree_gist extension (required for EXCLUDE constraints with non-btree operators)
create extension if not exists btree_gist;

-- 2. Create appointment_type enum
do $$ begin
  create type public.appointment_type as enum (
    'property_viewing', 'consultation', 'call', 'video_call'
  );
exception when duplicate_object then null; end $$;

-- 3. Add duration_minutes column with allowlist constraint
alter table public.appointments
  add column if not exists duration_minutes integer not null default 30;

do $$ begin
  alter table public.appointments
    add constraint appointments_duration_allowlist
    check (duration_minutes in (15, 30, 45, 60));
exception when duplicate_object then null; end $$;

-- 4. Add type column
alter table public.appointments
  add column if not exists type public.appointment_type not null default 'consultation';

-- 5. Add PostgreSQL EXCLUDE constraint for double-booking prevention
-- This guarantees that no two appointments for the same agent can have overlapping time ranges.
-- Only non-cancelled appointments participate in the exclusion check.
do $$ begin
  alter table public.appointments
    add constraint appointments_no_overlap
    exclude using gist (
      agent_id with =,
      tstzrange(
        scheduled_at,
        scheduled_at + (duration_minutes || ' minutes')::interval
      ) with &&
    )
    where (status != 'cancelled');
exception when duplicate_object then null; end $$;

-- 6. Add composite index for efficient availability queries
create index if not exists appointments_agent_scheduled_idx
  on public.appointments (agent_id, scheduled_at);

-- 7. Tighten RLS: Prevent agents from changing agent_id on existing appointments
-- Drop and recreate the write policy to add the agent_id immutability guard
drop policy if exists "appointments_write" on public.appointments;

-- INSERT: Staff can insert appointments where agent_id matches the lead's assigned agent
create policy "appointments_insert"
on public.appointments for insert
to authenticated
with check (
  public.is_admin()
  or agent_id = public.current_profile_id()
);

-- UPDATE: Staff can update their own appointments but cannot change agent_id
create policy "appointments_update"
on public.appointments for update
to authenticated
using (public.is_admin() or agent_id = public.current_profile_id())
with check (public.is_admin() or agent_id = public.current_profile_id());

-- DELETE: Only admins can delete appointments
create policy "appointments_delete"
on public.appointments for delete
to authenticated
using (public.is_admin());

-- Comments for schema documentation
comment on column public.appointments.duration_minutes is 'Appointment duration in minutes. Allowed: 15, 30, 45, 60.';
comment on column public.appointments.type is 'Type of appointment: property_viewing, consultation, call, video_call.';
comment on constraint appointments_no_overlap on public.appointments is 'Prevents overlapping appointments for the same agent. Database-level double-booking protection.';
