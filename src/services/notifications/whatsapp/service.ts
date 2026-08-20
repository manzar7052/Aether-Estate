/**
 * WhatsApp Notification Service — Phase 6C
 * Provider-agnostic service interface for transactional WhatsApp messaging.
 */

import { normalizePhoneNumber } from "./phone";
import { getWhatsAppProvider } from "./provider";
import type { SendWhatsAppOptions, WhatsAppSendResult } from "./types";

/**
 * Sends a transactional WhatsApp message via the active provider.
 * Normalizes and validates the destination phone number prior to provider dispatch.
 */
export async function sendWhatsApp(
  options: SendWhatsAppOptions,
): Promise<WhatsAppSendResult> {
  const phoneRes = normalizePhoneNumber(options.to);
  if (!phoneRes.valid || !phoneRes.normalized) {
    return {
      success: false,
      errorCode: phoneRes.reason === "MISSING_PHONE" ? "INVALID_PHONE" : "INVALID_PHONE",
      errorMessage: `Invalid recipient phone number: ${phoneRes.reason || "MALFORMED"}`,
    };
  }

  const provider = getWhatsAppProvider();

  try {
    const result = await provider.send({
      ...options,
      to: phoneRes.normalized,
    });
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      errorCode: "PROVIDER_TEMPORARY_ERROR",
      errorMessage: message,
    };
  }
}
