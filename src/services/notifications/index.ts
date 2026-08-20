// ─── Notification & Email Automation Exports ────────────────────────────────

export * from "./email/types";
export * from "./email/provider";
export * from "./email/resend-provider";
export * from "./email/dev-provider";
export * from "./email/service";
export * from "./email/formatters";
export * from "./email/templates/appointment-created";
export * from "./email/templates/appointment-rescheduled";
export * from "./email/templates/appointment-cancelled";
export * from "./email/templates/appointment-reminder";
export * from "./events/types";
export * from "./events/handler";
export * from "./whatsapp";
export * from "./logs";

/**
 * Checks whether production email dispatch is configured via RESEND_API_KEY.
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Checks whether production WhatsApp dispatch is configured via Twilio credentials.
 */
export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}
