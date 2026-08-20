import { createServiceRoleClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/utils/errors";
import type { LeadMessage, MessageRole } from "@/types/database";
import type { ChatMessage } from "@/services/ai/types";

/**
 * Persists a user or assistant message to PostgreSQL (lead_messages).
 */
export async function persistMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
): Promise<LeadMessage> {
  const cleanContent = content.trim();
  if (!cleanContent) {
    throw new AppError("INVALID_MESSAGE", "Message content cannot be empty.", 400);
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("lead_messages")
    .insert({
      conversation_id: conversationId,
      role,
      content: cleanContent,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error(
      `[persistMessage] Failed to persist message for conversation ${conversationId}:`,
      error?.message,
    );
    throw new AppError(
      "MESSAGE_PERSIST_FAILED",
      "Failed to persist message to conversation history.",
      500,
    );
  }

  return data as unknown as LeadMessage;
}

/**
 * Retrieves ordered conversation messages from PostgreSQL for AI context or UI rehydration.
 * Preserves chronological order (oldest -> newest).
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 20,
): Promise<ChatMessage[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("lead_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) {
    console.error(
      `[getConversationMessages] Failed loading messages for ${conversationId}:`,
      error?.message,
    );
    return [];
  }

  return data
    .filter(
      (msg) =>
        !msg.content.startsWith("__session_token__:") &&
        !msg.content.startsWith("__consent_confirmed__:"),
    )
    .map((msg) => ({
      role: (msg.role === "agent" ? "assistant" : msg.role) as
        | "user"
        | "assistant"
        | "system",
      content: msg.content,
    }));
}
