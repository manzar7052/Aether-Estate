import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireApiStaff } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";
import { qualifyLead } from "@/services/qualification";
import { extractQualificationSignals } from "./extractor";
import {
  evaluateSignalsAndConflicts,
  type QualificationConflict,
  type SuggestedEnrichments,
} from "./merge";
import type { AIQualificationSignals } from "./schema";
import type { Lead } from "@/types/database";

export interface AIQualificationServiceResult {
  lead: Lead;
  signals: AIQualificationSignals;
  conflicts: QualificationConflict[];
  suggestedEnrichments: SuggestedEnrichments;
  model: string;
  durationMs: number;
}

/**
 * Analyzes a lead and its conversation history with Gemini AI.
 * Enforces strict multi-agent authorization (Admin or assigned Agent).
 * Gemini extracts structured signals; Phase 4A deterministic engine remains the authoritative score authority.
 */
export async function analyzeLeadWithAI(
  leadId: string,
  options: { applySuggestions?: boolean } = {},
): Promise<AIQualificationServiceResult> {
  // 1. Authorize caller identity & role
  const { profile } = await requireApiStaff();

  if (!leadId) {
    throw new AppError("INVALID_LEAD_ID", "Lead ID is required.", 400);
  }

  const supabase = await createServerSupabaseClient();
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceRoleClient()
    : supabase;

  // 2. Fetch lead and verify authorization
  let { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if ((leadErr || !lead) && admin) {
    const fallback = await admin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();
    lead = fallback.data;
    leadErr = fallback.error;
  }

  if (leadErr || !lead) {
    throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
  }

  // Multi-Agent Security Boundary: Agents can only analyze their own assigned leads
  if (profile.role === "agent" && lead.assigned_agent_id !== profile.id) {
    console.warn(
      `[Security Violation] Agent ${profile.id} attempted AI analysis on unassigned lead ${leadId}`,
    );
    throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
  }

  // 3. Fetch linked conversation messages
  let messages: Array<{ role: string; content: string; createdAt?: string }> = [];

  const { data: conv } = await admin
    .from("lead_conversations")
    .select("id")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (conv?.id) {
    const { data: rawMsgs } = await admin
      .from("lead_messages")
      .select("role, content, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    if (rawMsgs) {
      messages = rawMsgs.filter(
        (m) =>
          m.role !== "system" &&
          !m.content.startsWith("__session_token__:") &&
          !m.content.startsWith("__consent_confirmed__:"),
      );
    }
  }

  // 4. Run AI extraction via Gemini
  const extraction = await extractQualificationSignals({
    lead: {
      fullName: lead.full_name,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      budgetMin: lead.budget_min,
      budgetMax: lead.budget_max,
      timeline: lead.timeline,
      propertyType: lead.property_type,
      bedrooms: lead.bedrooms,
      message: lead.message,
      source: lead.source,
    },
    messages,
  });

  // 5. Evaluate conflicts against authoritative lead fields
  const evaluation = evaluateSignalsAndConflicts(
    lead as unknown as Lead,
    extraction.signals,
  );

  const updatedAt = new Date().toISOString();

  // 6. Optional: Apply non-conflicting enrichments if requested
  const updates: Partial<Lead> = {
    ai_qualification_signals: extraction.signals,
    ai_qualification_model: extraction.model,
    ai_qualification_updated_at: updatedAt,
  };

  if (options.applySuggestions && evaluation.hasEnrichments) {
    const e = evaluation.suggestedEnrichments;
    if (e.budget_min !== undefined) updates.budget_min = e.budget_min;
    if (e.budget_max !== undefined) updates.budget_max = e.budget_max;
    if (e.timeline !== undefined) updates.timeline = e.timeline;
    if (e.city !== undefined) updates.city = e.city;
    if (e.property_type !== undefined) updates.property_type = e.property_type;
    if (e.bedrooms !== undefined) updates.bedrooms = e.bedrooms;
  }

  // 7. Persist AI extraction signals to PostgreSQL
  let { data: updatedLead, error: updateErr } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", leadId)
    .select("*")
    .maybeSingle();

  if ((updateErr || !updatedLead) && admin) {
    const fallback = await admin
      .from("leads")
      .update(updates)
      .eq("id", leadId)
      .select("*")
      .maybeSingle();
    updatedLead = fallback.data;
    updateErr = fallback.error;
  }

  // Fallback if migration 0007 columns are in transition
  if (updateErr) {
    console.warn(`[analyzeLeadWithAI] AI columns notice:`, updateErr.message);
    const { data: safeFallback } = await admin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();
    if (safeFallback) {
      updatedLead = {
        ...safeFallback,
        ai_qualification_signals: extraction.signals,
        ai_qualification_model: extraction.model,
        ai_qualification_updated_at: updatedAt,
      };
    }
  }

  // 8. If suggestions were applied, re-run deterministic qualification engine
  if (options.applySuggestions && evaluation.hasEnrichments) {
    await qualifyLead(leadId);
    const { data: requalified } = await admin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();
    if (requalified) {
      updatedLead = requalified;
    }
  }

  console.log(
    `[AI Qualification Complete] Lead ${leadId} analyzed by ${extraction.model} (${extraction.durationMs}ms)`,
  );

  return {
    lead: (updatedLead || lead) as unknown as Lead,
    signals: extraction.signals,
    conflicts: evaluation.conflicts,
    suggestedEnrichments: evaluation.suggestedEnrichments,
    model: extraction.model,
    durationMs: extraction.durationMs,
  };
}
