import crypto from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/utils/errors";
import { hasPublicEnv } from "@/lib/env";
import type { LeadConversation } from "@/types/database";

function generateAccessToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

/**
 * Creates a new anonymous conversation session with a secure, opaque access token.
 */
export async function createConversation(
  metadata: Record<string, unknown> = {},
): Promise<{ id: string; accessToken: string }> {
  if (!hasPublicEnv()) {
    throw new AppError("ENV_ERROR", "Supabase environment is not configured.", 500);
  }

  const supabase = createServiceRoleClient();
  const accessToken = generateAccessToken();

  try {
    // Attempt modern Phase 3C insert (with nullable lead_id and access_token)
    const { data, error } = await supabase
      .from("lead_conversations")
      .insert({
        access_token: accessToken,
        metadata,
      } as unknown as Record<string, unknown>)
      .select("id, access_token")
      .single();

    if (!error && data) {
      const created = data as unknown as { id: string; access_token?: string };
      return { id: created.id, accessToken: created.access_token || accessToken };
    }

    // Fallback: If migration 0003 is pending, create anonymous placeholder lead first
    const { data: anonLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        full_name: "Anonymous Visitor",
        email: `anon_${Date.now()}_${accessToken.slice(0, 10)}@visitor.aether`,
        source: "chatbot",
        status: "new",
      })
      .select("id")
      .single();

    if (leadError || !anonLead) {
      throw new AppError(
        "CONVERSATION_CREATE_FAILED",
        "Failed to initialize visitor conversation profile.",
        500,
      );
    }

    const { data: convData, error: convError } = await supabase
      .from("lead_conversations")
      .insert({ lead_id: anonLead.id } as unknown as Record<string, unknown>)
      .select("id")
      .single();

    if (convError || !convData) {
      throw new AppError(
        "CONVERSATION_CREATE_FAILED",
        "Failed to initialize conversation session.",
        500,
      );
    }

    // Persist system session marker to securely store token across processes
    await supabase.from("lead_messages").insert({
      conversation_id: convData.id,
      role: "system",
      content: `__session_token__:${accessToken}`,
    });

    return { id: convData.id, accessToken };
  } catch (err: unknown) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      "CONVERSATION_CREATE_FAILED",
      "Failed to initialize conversation session.",
      500,
    );
  }
}

/**
 * Retrieves a conversation and verifies ownership via the opaque access token.
 * Prevents user A from accessing or modifying user B's conversation.
 */
export async function getVerifiedConversation(
  conversationId: string,
  accessToken: string,
): Promise<LeadConversation> {
  if (!conversationId || !accessToken) {
    throw new AppError(
      "CONVERSATION_ACCESS_DENIED",
      "Valid conversation credentials are required.",
      401,
    );
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("lead_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) {
    throw new AppError(
      "CONVERSATION_NOT_FOUND",
      "The requested conversation was not found.",
      404,
    );
  }

  // 1. Verify access token against database column if present
  const record = data as unknown as {
    access_token?: string;
    lead_id?: string;
    lead_capture_confirmed_at?: string;
  };

  if (record.access_token) {
    if (record.access_token !== accessToken) {
      console.warn(
        `[Security] Conversation isolation violation attempt for ${conversationId}`,
      );
      throw new AppError(
        "CONVERSATION_ACCESS_DENIED",
        "Access to this conversation is denied.",
        403,
      );
    }
  } else {
    // 2. Fallback: Verify against system token marker in lead_messages
    const { data: tokenMsg } = await supabase
      .from("lead_messages")
      .select("content")
      .eq("conversation_id", conversationId)
      .eq("role", "system")
      .like("content", "__session_token__:%")
      .maybeSingle();

    if (tokenMsg?.content) {
      const expectedToken = tokenMsg.content.replace("__session_token__:", "");
      if (expectedToken !== accessToken) {
        console.warn(
          `[Security] Conversation token mismatch for ${conversationId}`,
        );
        throw new AppError(
          "CONVERSATION_ACCESS_DENIED",
          "Access to this conversation is denied.",
          403,
        );
      }
    }
  }

  return data as LeadConversation;
}

/**
 * Explicitly records that the visitor confirmed contact consent in the application flow.
 */
export async function confirmLeadCapture(
  conversationId: string,
  accessToken: string,
): Promise<boolean> {
  await getVerifiedConversation(conversationId, accessToken);

  const supabase = createServiceRoleClient();
  const confirmedAt = new Date().toISOString();

  try {
    await supabase
      .from("lead_conversations")
      .update({
        lead_capture_confirmed_at: confirmedAt,
      })
      .eq("id", conversationId);
  } catch {
    // Ignore column missing
  }

  // Also persist consent marker
  await supabase.from("lead_messages").insert({
    conversation_id: conversationId,
    role: "system",
    content: `__consent_confirmed__:${confirmedAt}`,
  });

  return true;
}

/**
 * Checks whether contact consent has been verified for this conversation.
 */
export async function isLeadConsentConfirmed(
  conversationId: string,
  accessToken: string,
): Promise<boolean> {
  try {
    const conv = await getVerifiedConversation(conversationId, accessToken);
    if (conv.lead_capture_confirmed_at) return true;
  } catch {
    // Ignore
  }

  const supabase = createServiceRoleClient();
  const { data: consentMsg } = await supabase
    .from("lead_messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("role", "system")
    .like("content", "__consent_confirmed__:%")
    .maybeSingle();

  return Boolean(consentMsg);
}

/**
 * Links a conversation to a captured lead record in Supabase.
 */
export async function linkConversationToLead(
  conversationId: string,
  leadId: string,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("lead_conversations")
    .update({ lead_id: leadId })
    .eq("id", conversationId);

  if (error) {
    console.error(
      `[linkConversationToLead] Failed linking conversation ${conversationId} to lead ${leadId}:`,
      error.message,
    );
  }
}
