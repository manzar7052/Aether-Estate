/**
 * Communication Logs & Preferences Service — Phase 6D
 * Centralized service recording notification delivery outcomes and managing lead preferences.
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { CommunicationLog, Lead } from "@/types/database";
import type {
  RecordCommunicationLogInput,
  GetCommunicationLogsOptions,
  PaginatedCommunicationLogs,
  CommunicationPreferences,
  UpdateCommunicationPreferencesInput,
} from "./types";

/**
 * Records an outcome in the audit communication log table.
 * Executed server-side after delivery attempts (sent, skipped, or failed).
 */
export async function recordCommunicationLog(
  input: RecordCommunicationLogInput,
): Promise<CommunicationLog | null> {
  try {
    const admin = createServiceRoleClient();
    const now = new Date().toISOString();

    const payload = {
      lead_id: input.leadId,
      appointment_id: input.appointmentId || null,
      channel: input.channel,
      event_type: input.eventType,
      recipient_type: input.recipientType,
      recipient: input.recipient,
      status: input.status,
      template: input.template || null,
      provider_message_id: input.providerMessageId || null,
      error_code: input.errorCode || null,
      error_message: input.errorMessage || null,
      metadata: input.metadata || {},
      sent_at: input.status === "sent" ? input.sentAt || now : null,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await admin
      .from("communication_logs")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[CommunicationLogs] Failed to record log:", error.message);
      return null;
    }

    return data as CommunicationLog;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CommunicationLogs] Exception recording log:", msg);
    return null;
  }
}

/**
 * Retrieves paginated communication history for a given lead.
 */
export async function getCommunicationLogs(
  leadId: string,
  options?: GetCommunicationLogsOptions,
): Promise<PaginatedCommunicationLogs> {
  const admin = createServiceRoleClient();
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const offset = (page - 1) * limit;

  let query = admin
    .from("communication_logs")
    .select("*", { count: "exact" })
    .eq("lead_id", leadId);

  if (options?.channel && options.channel !== "all") {
    query = query.eq("channel", options.channel);
  }

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch communication logs: ${error.message}`);
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: (data || []) as CommunicationLog[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Fetches communication preferences for a lead.
 */
export async function getCommunicationPreferences(
  leadId: string,
): Promise<CommunicationPreferences> {
  const admin = createServiceRoleClient();

  const { data: lead, error } = await admin
    .from("leads")
    .select("id, whatsapp_opt_in, whatsapp_opt_in_at, whatsapp_opt_out_at, email_transactional_opt_in, email_preferences_updated_at")
    .eq("id", leadId)
    .maybeSingle();

  if (error || !lead) {
    throw new Error(`Lead not found or failed to load preferences: ${error?.message}`);
  }

  return {
    leadId: lead.id,
    email: {
      transactionalOptIn: lead.email_transactional_opt_in ?? true,
      updatedAt: lead.email_preferences_updated_at || null,
    },
    whatsapp: {
      optIn: lead.whatsapp_opt_in ?? false,
      optInAt: lead.whatsapp_opt_in_at || null,
      optOutAt: lead.whatsapp_opt_out_at || null,
    },
  };
}

/**
 * Updates communication preferences for a lead.
 */
export async function updateCommunicationPreferences(
  leadId: string,
  input: UpdateCommunicationPreferencesInput,
): Promise<CommunicationPreferences> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const updatePayload: Partial<Lead> = { updated_at: now };

  if (typeof input.whatsappOptIn === "boolean") {
    updatePayload.whatsapp_opt_in = input.whatsappOptIn;
    if (input.whatsappOptIn) {
      updatePayload.whatsapp_opt_in_at = now;
      updatePayload.whatsapp_opt_out_at = null;
    } else {
      updatePayload.whatsapp_opt_out_at = now;
    }
  }

  if (typeof input.emailTransactionalOptIn === "boolean") {
    updatePayload.email_transactional_opt_in = input.emailTransactionalOptIn;
    updatePayload.email_preferences_updated_at = now;
  }

  const { error } = await admin
    .from("leads")
    .update(updatePayload)
    .eq("id", leadId);

  if (error) {
    throw new Error(`Failed to update communication preferences for lead ${leadId}: ${error.message}`);
  }

  return getCommunicationPreferences(leadId);
}
