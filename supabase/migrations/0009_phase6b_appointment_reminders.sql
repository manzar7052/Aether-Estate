-- =============================================================================
-- Migration 0009: Phase 6B — Appointment Reminders Table & Indexes
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('reminder_24h', 'reminder_1h')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'skipped', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT appointment_reminders_unique_type UNIQUE (appointment_id, reminder_type)
);

-- Efficient indexing for due-query processing and appointment lookups
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_due 
  ON public.appointment_reminders (status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appt 
  ON public.appointment_reminders (appointment_id);

-- Enable Row Level Security
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

-- Staff read access: Admins can read all; Agents can read reminders for their assigned appointments
CREATE POLICY "appointment_reminders_select"
  ON public.appointment_reminders
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_reminders.appointment_id 
        AND a.agent_id = current_profile_id()
    )
  );

-- Admins full access policy
CREATE POLICY "appointment_reminders_admin_all"
  ON public.appointment_reminders
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Anon access strictly blocked by default (no policies for anon role)
