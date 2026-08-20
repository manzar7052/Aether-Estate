-- Phase 4B Migration: CRM Agent Visibility & Status Management Policies
-- Grants authenticated staff (admin and agent roles) select and update access to leads
-- during the interim Phase 4B period prior to agent assignment in Phase 4C.

create or replace function public.is_staff()
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
      and role in ('admin', 'agent')
  );
$$;

-- Update leads policies for staff CRM access
drop policy if exists "leads_select" on public.leads;
create policy "leads_select"
on public.leads for select
to authenticated
using (
  public.is_admin()
  or public.is_staff()
  or assigned_agent_id = public.current_profile_id()
);

drop policy if exists "leads_update" on public.leads;
create policy "leads_update"
on public.leads for update
to authenticated
using (
  public.is_admin()
  or public.is_staff()
  or assigned_agent_id = public.current_profile_id()
)
with check (
  public.is_admin()
  or public.is_staff()
  or assigned_agent_id = public.current_profile_id()
);
