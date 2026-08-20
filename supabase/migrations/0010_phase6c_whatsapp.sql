-- =============================================================================
-- Migration 0010: Phase 6C — WhatsApp Consent & Notification Preferences
-- =============================================================================

-- Add WhatsApp consent tracking columns to public.leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out_at TIMESTAMPTZ;

-- Add WhatsApp staff notification preference to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled BOOLEAN NOT NULL DEFAULT true;

-- Index for opt-in queries
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_opt_in 
  ON public.leads (whatsapp_opt_in);
