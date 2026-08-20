/**
 * WhatsApp Automation Domain Types — Phase 6C
 */

export type WhatsAppErrorCode =
  | "INVALID_PHONE"
  | "NO_OPT_IN"
  | "PROVIDER_AUTH_ERROR"
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_TEMPORARY_ERROR"
  | "TEMPLATE_ERROR"
  | "UNKNOWN";

export interface SendWhatsAppOptions {
  to: string; // E.164 normalized phone number (e.g. +15125551234)
  body: string;
  templateName?: string;
  parameters?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface WhatsAppSendResult {
  success: boolean;
  providerMessageId?: string;
  errorCode?: WhatsAppErrorCode;
  errorMessage?: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  send(options: SendWhatsAppOptions): Promise<WhatsAppSendResult>;
}

export interface AppointmentWhatsAppTemplateData {
  appointmentId: string;
  appointmentType: string;
  typeLabel: string;
  durationMinutes: number;
  scheduledAt: string;
  previousScheduledAt?: string;
  formattedDateTime: string;
  previousFormattedDateTime?: string;
  timezone: string;
  leadName: string;
  leadPhone: string | null;
  agentName: string;
  agentPhone?: string | null;
  propertyName?: string | null;
  propertyCity?: string | null;
  propertyPrice?: number | null;
  cancellationReason?: string | null;
  crmLeadUrl?: string;
  publicSupportUrl?: string;
}

export interface RenderedWhatsAppMessage {
  body: string;
  templateName: string;
  parameters: Record<string, string>;
}
