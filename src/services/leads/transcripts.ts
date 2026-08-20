import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireApiStaff } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";
import type { MessageRole } from "@/types/database";

export interface TranscriptMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface LeadTranscriptResult {
  conversationId: string | null;
  leadId: string;
  leadName: string;
  messages: TranscriptMessage[];
}

/**
 * Retrieves the full chronological conversation transcript for an accessible lead.
 * Enforces strict multi-agent authorization (Admin or assigned Agent).
 */
export async function getLeadTranscript(
  leadId: string,
): Promise<LeadTranscriptResult> {
  // 1. Authorize caller identity & role
  const { profile } = await requireApiStaff();

  if (!leadId) {
    throw new AppError("INVALID_LEAD_ID", "Lead ID is required.", 400);
  }

  const supabase = await createServerSupabaseClient();
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceRoleClient()
    : supabase;

  // 2. Fetch parent lead and verify access
  let { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, full_name, assigned_agent_id")
    .eq("id", leadId)
    .maybeSingle();

  if ((leadErr || !lead) && admin) {
    const fallback = await admin
      .from("leads")
      .select("id, full_name, assigned_agent_id")
      .eq("id", leadId)
      .maybeSingle();
    lead = fallback.data;
    leadErr = fallback.error;
  }

  if (leadErr || !lead) {
    // Resource hiding: return 404 for non-existent or inaccessible leads
    throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
  }

  // 3. Multi-Agent Authorization Boundary Check
  if (profile.role === "agent" && lead.assigned_agent_id !== profile.id) {
    console.warn(
      `[Security Violation Attempt] Agent ${profile.id} attempted accessing transcript for unassigned Lead ${leadId}`,
    );
    throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
  }

  // 4. Look up linked conversation
  let { data: conv, error: convErr } = await supabase
    .from("lead_conversations")
    .select("id")
    .eq("lead_id", leadId)
    .maybeSingle();

  if ((convErr || !conv) && admin) {
    const fallbackConv = await admin
      .from("lead_conversations")
      .select("id")
      .eq("lead_id", leadId)
      .maybeSingle();
    conv = fallbackConv.data;
    convErr = fallbackConv.error;
  }

  // 5. Clean Empty State: Lead has no chatbot conversation recorded
  if (!conv || !conv.id) {
    return {
      conversationId: null,
      leadId,
      leadName: lead.full_name,
      messages: [],
    };
  }

  // 6. Fetch ordered messages (Chronological: oldest -> newest)
  let { data: rawMessages, error: msgErr } = await supabase
    .from("lead_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true });

  if ((msgErr || !rawMessages) && admin) {
    const fallbackMsgs = await admin
      .from("lead_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    rawMessages = fallbackMsgs.data;
    msgErr = fallbackMsgs.error;
  }

  if (msgErr) {
    console.error(`[getLeadTranscript] Failed fetching messages for ${conv.id}:`, msgErr.message);
    throw new AppError(
      "TRANSCRIPT_FETCH_FAILED",
      "Unable to load the conversation transcript.",
      500,
    );
  }

  // 7. Filter system token markers and format clean application DTO
  const messages: TranscriptMessage[] = (rawMessages || [])
    .filter(
      (m) =>
        m.role !== "system" &&
        !m.content.startsWith("__session_token__:") &&
        !m.content.startsWith("__consent_confirmed__:"),
    )
    .map((m) => ({
      id: m.id,
      role: m.role as MessageRole,
      content: m.content,
      createdAt: m.created_at,
    }));

  return {
    conversationId: conv.id,
    leadId,
    leadName: lead.full_name,
    messages,
  };
}
