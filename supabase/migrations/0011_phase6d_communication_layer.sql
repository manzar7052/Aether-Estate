-- =============================================================================
-- Migration 0011: Phase 6D — Communication Logs & Preference Management
-- =============================================================================

-- 1. Create Controlled Custom Enum Types
DO $$ BEGIN
  CREATE TYPE public.communication_channel AS ENUM ('email', 'whatsapp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.communication_recipient_type AS ENUM ('customer', 'agent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.communication_status AS ENUM ('pending', 'sent', 'skipped', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add Transactional Email Preference tracking to public.leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email_transactional_opt_in BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_preferences_updated_at TIMESTAMPTZ;

-- 3. Create public.communication_logs table
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments (id) ON DELETE SET NULL,
  channel public.communication_channel NOT NULL,
  event_type TEXT NOT NULL,
  recipient_type public.communication_recipient_type NOT NULL,
  recipient TEXT NOT NULL,
  status public.communication_status NOT NULL DEFAULT 'pending',
  template TEXT,
  provider_message_id TEXT,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create Performance Indexes
CREATE INDEX IF NOT EXISTS communication_logs_lead_idx 
  ON public.communication_logs (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS communication_logs_appointment_idx 
  ON public.communication_logs (appointment_id);

CREATE INDEX IF NOT EXISTS communication_logs_channel_status_idx 
  ON public.communication_logs (channel, status);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "communication_logs_select" ON public.communication_logs;
DROP POLICY IF EXISTS "communication_logs_admin_write" ON public.communication_logs;

-- SELECT Policy:
-- - Admins can read all logs.
-- - Agents can read logs for leads assigned to them or appointments assigned to them.
-- - Anonymous / Public has NO access.
CREATE POLICY "communication_logs_select"
ON public.communication_logs FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = communication_logs.lead_id
      AND leads.assigned_agent_id = public.current_profile_id()
  )
  OR EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.id = communication_logs.appointment_id
      AND appointments.agent_id = public.current_profile_id()
  )
);

-- WRITE Policy:
-- Service role and Admins can manage logs
CREATE POLICY "communication_logs_admin_write"
ON public.communication_logs FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
