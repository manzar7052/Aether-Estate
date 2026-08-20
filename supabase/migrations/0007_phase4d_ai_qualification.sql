-- Phase 4D Migration: AI-Assisted Lead Qualification Columns
-- 1. ai_qualification_signals: Structured JSONB storing extracted signals (budget, timeline, property fit, intent, confidence, evidence)
-- 2. ai_qualification_model: Identifier of the AI model used for extraction (e.g., gemini-2.5-flash)
-- 3. ai_qualification_updated_at: Timestamp when AI extraction was last performed

alter table public.leads
  add column if not exists ai_qualification_signals jsonb,
  add column if not exists ai_qualification_model text,
  add column if not exists ai_qualification_updated_at timestamptz;

-- Comment for schema documentation
comment on column public.leads.ai_qualification_signals is 'Structured AI-extracted signals for budget, timeline, criteria, and intent with confidence and evidence';
comment on column public.leads.ai_qualification_model is 'AI provider/model name used for qualification extraction';
comment on column public.leads.ai_qualification_updated_at is 'Timestamp of the latest AI qualification extraction';
