import { createServiceRoleClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/utils/errors";
import { calculateQualificationScore } from "./scoring";
import type { QualificationResult, ScoringLeadInput, EngagementSignals } from "./types";

/**
 * Evaluates and persists the qualification score, category, breakdown, and reasons for a lead in PostgreSQL.
 * Synchronous and idempotent.
 */
export async function qualifyLead(
  leadId: string,
  extraSignals?: Partial<EngagementSignals>,
): Promise<QualificationResult> {
  if (!leadId) {
    throw new AppError("INVALID_LEAD_ID", "Lead ID is required for qualification.", 400);
  }

  const supabase = createServiceRoleClient();

  // 1. Fetch Lead record
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError || !lead) {
    console.error(`[qualifyLead] Lead not found: ${leadId}`, leadError?.message);
    throw new AppError("LEAD_NOT_FOUND", `Lead ${leadId} was not found.`, 404);
  }

  // 2. Fetch associated conversation and message statistics for engagement signals
  let userMessageCount = extraSignals?.userMessageCount || 0;
  let isContactConfirmed = Boolean(extraSignals?.isContactConfirmed);
  let hasPropertySearch = Boolean(extraSignals?.hasPropertySearch);

  const { data: conversations } = await supabase
    .from("lead_conversations")
    .select("id, lead_capture_confirmed_at")
    .eq("lead_id", leadId);

  if (conversations && conversations.length > 0) {
    for (const conv of conversations) {
      if (conv.lead_capture_confirmed_at) {
        isContactConfirmed = true;
      }

      // Count user messages
      const { data: msgs } = await supabase
        .from("lead_messages")
        .select("id, content, role")
        .eq("conversation_id", conv.id);

      if (msgs) {
        const userMsgs = msgs.filter((m) => m.role === "user");
        userMessageCount += userMsgs.length;

        // Check if messages indicate a property search
        if (
          userMsgs.some(
            (m) =>
              m.content.toLowerCase().includes("show") ||
              m.content.toLowerCase().includes("find") ||
              m.content.toLowerCase().includes("search") ||
              m.content.toLowerCase().includes("bedroom") ||
              m.content.toLowerCase().includes("home"),
          )
        ) {
          hasPropertySearch = true;
        }
      }
    }
  }

  // If lead originated from website or chatbot, contact was confirmed
  if (lead.source === "chatbot" || lead.source === "property_page") {
    isContactConfirmed = true;
  }

  const scoringInput: ScoringLeadInput = {
    budget_min: lead.budget_min ? Number(lead.budget_min) : null,
    budget_max: lead.budget_max ? Number(lead.budget_max) : null,
    timeline: lead.timeline,
    city: lead.city,
    property_type: lead.property_type,
    bedrooms: lead.bedrooms,
    property_id: lead.property_id,
    engagement: {
      conversationExists: Boolean(conversations && conversations.length > 0),
      userMessageCount,
      isContactConfirmed,
      hasPropertySearch,
      hasPropertyView: Boolean(lead.property_id),
      ...extraSignals,
    },
  };

  // 3. Compute deterministic score
  const result = calculateQualificationScore(scoringInput);

  // 4. Persist result to Supabase
  const qualifiedAt = new Date().toISOString();

  try {
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        lead_score: result.totalScore,
        qualification_category: result.category,
        qualification_breakdown: result.breakdown,
        qualification_reasons: result.reasons,
        qualified_at: qualifiedAt,
      })
      .eq("id", leadId);

    if (updateError) {
      // Fallback if migration 0004 columns are not yet in remote DB: update lead_score
      await supabase
        .from("leads")
        .update({
          lead_score: result.totalScore,
        })
        .eq("id", leadId);
    }
  } catch (err) {
    console.warn(`[qualifyLead] Persistence notice for lead ${leadId}:`, err);
  }

  console.log(
    `[Lead Qualification] Lead ${leadId} scored ${result.totalScore}/100 (${result.category.toUpperCase()})`,
  );

  return result;
}
