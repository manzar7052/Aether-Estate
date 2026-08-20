/**
 * WhatsApp Consent & Opt-In State Service — Phase 6C
 * Source of truth for explicit WhatsApp consent. AI is NEVER permitted to grant consent.
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { Lead, Profile } from "@/types/database";
import { normalizePhoneNumber } from "./phone";

export interface ConsentEligibilityResult {
  eligible: boolean;
  normalizedPhone?: string;
  reason?: "MISSING_PHONE" | "INVALID_PHONE" | "NO_OPT_IN" | "NOTIFICATIONS_DISABLED";
}

/**
 * Explicit application-controlled opt-in / opt-out mutation.
 */
export async function setLeadWhatsAppConsent(
  leadId: string,
  optIn: boolean,
): Promise<{ success: boolean; optIn: boolean; updatedAt: string }> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  const updatePayload = optIn
    ? {
        whatsapp_opt_in: true,
        whatsapp_opt_in_at: now,
        whatsapp_opt_out_at: null,
        updated_at: now,
      }
    : {
        whatsapp_opt_in: false,
        whatsapp_opt_out_at: now,
        updated_at: now,
      };

  const { error } = await admin
    .from("leads")
    .update(updatePayload)
    .eq("id", leadId);

  if (error) {
    throw new Error(`Failed to update WhatsApp consent for lead ${leadId}: ${error.message}`);
  }

  return {
    success: true,
    optIn,
    updatedAt: now,
  };
}

/**
 * Checks whether a customer lead is eligible to receive transactional WhatsApp messages.
 * Requirements:
 * 1. Valid phone present
 * 2. E.164 normalized
 * 3. whatsapp_opt_in === true
 */
export function checkCustomerWhatsAppEligibility(
  lead: Lead | null | undefined,
): ConsentEligibilityResult {
  if (!lead) {
    return { eligible: false, reason: "MISSING_PHONE" };
  }

  const phoneRes = normalizePhoneNumber(lead.phone);
  if (!phoneRes.valid || !phoneRes.normalized) {
    return {
      eligible: false,
      reason: phoneRes.reason === "MISSING_PHONE" ? "MISSING_PHONE" : "INVALID_PHONE",
    };
  }

  if (lead.whatsapp_opt_in !== true) {
    return { eligible: false, reason: "NO_OPT_IN" };
  }

  return {
    eligible: true,
    normalizedPhone: phoneRes.normalized,
  };
}

/**
 * Checks whether an agent is eligible to receive staff WhatsApp alerts.
 * Requirements:
 * 1. Valid phone present on agent profile
 * 2. E.164 normalized
 * 3. whatsapp_notifications_enabled !== false (defaults to true for active staff with phone)
 */
export function checkAgentWhatsAppEligibility(
  agent: Profile | null | undefined,
): ConsentEligibilityResult {
  if (!agent) {
    return { eligible: false, reason: "MISSING_PHONE" };
  }

  const phoneRes = normalizePhoneNumber(agent.phone);
  if (!phoneRes.valid || !phoneRes.normalized) {
    return {
      eligible: false,
      reason: phoneRes.reason === "MISSING_PHONE" ? "MISSING_PHONE" : "INVALID_PHONE",
    };
  }

  if (agent.whatsapp_notifications_enabled === false) {
    return { eligible: false, reason: "NOTIFICATIONS_DISABLED" };
  }

  return {
    eligible: true,
    normalizedPhone: phoneRes.normalized,
  };
}
