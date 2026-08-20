-- Phase 4C Migration: Agent Assignment & Conversation Access RLS Policies
-- 1. Restricts agent visibility strictly to assigned leads (assigned_agent_id = current_profile_id())
-- 2. Restricts conversation transcripts strictly to authorized lead owners / admins
-- 3. Grants administrators global assignment, visibility, and transcript inspection

-- Performance indexes for agent lookups and chronological transcript ordering
create index if not exists leads_assigned_agent_idx on public.leads (assigned_agent_id);
create index if not exists lead_conversations_lead_idx on public.lead_conversations (lead_id);
create index if not exists lead_messages_conversation_created_idx on public.lead_messages (conversation_id, created_at asc);

-- 1. Leads Select Policy
drop policy if exists "leads_select" on public.leads;
create policy "leads_select"
on public.leads for select
to authenticated
using (
  public.is_admin()
  or assigned_agent_id = public.current_profile_id()
);

-- 2. Leads Update Policy (Prevents agents from reassigning leads)
drop policy if exists "leads_update" on public.leads;
create policy "leads_update"
on public.leads for update
to authenticated
using (
  public.is_admin()
  or assigned_agent_id = public.current_profile_id()
)
with check (
  public.is_admin()
  or assigned_agent_id = public.current_profile_id()
);

-- 3. Conversations Select Policy (Follows parent lead authorization)
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

-- 4. Messages Select Policy (Follows parent lead authorization)
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
