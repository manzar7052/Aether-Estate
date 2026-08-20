-- Phase 3C migration: Anonymous conversation persistence and lead capture
-- 1. Make lead_conversations.lead_id nullable (allows pre-lead visitor conversations)
-- 2. Add access_token to lead_conversations for secure conversation isolation
-- 3. Add lead_capture_confirmed_at to lead_conversations for explicit application consent
-- 4. Add metadata jsonb to lead_conversations
-- 5. Add indices on access_token and lead_id

-- Make lead_id nullable
alter table public.lead_conversations
  alter column lead_id drop not null;

-- Add access token for secure session access without exposing raw DB identifiers
alter table public.lead_conversations
  add column if not exists access_token text not null default encode(gen_random_bytes(24), 'hex'),
  add column if not exists lead_capture_confirmed_at timestamptz,
  add column if not exists metadata jsonb not null default '{}';

-- Indices for rapid lookup
create index if not exists lead_conversations_access_token_idx on public.lead_conversations (access_token);
create index if not exists lead_conversations_lead_id_idx on public.lead_conversations (lead_id);
create index if not exists lead_messages_conversation_id_created_at_idx on public.lead_messages (conversation_id, created_at asc);
