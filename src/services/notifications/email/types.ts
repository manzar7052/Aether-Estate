import type { AppointmentType, QualificationCategory } from "@/types/database";

/**
 * Standardized email recipient.
 */
export interface EmailRecipient {
  email: string;
  name?: string;
}

/**
 * Core send options for provider-independent email dispatch.
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  metadata?: Record<string, string>;
}

/**
 * Result returned by email providers.
 */
export interface EmailSendResult {
  success: boolean;
  providerMessageId?: string;
  provider: string;
  errorCode?: string;
  error?: string;
  previewUrl?: string;
}

/**
 * Structured template data for appointment-related emails.
 */
export interface AppointmentEmailTemplateData {
  appointmentId: string;
  appointmentType: AppointmentType;
  typeLabel: string;
  durationMinutes: number;
  scheduledAt: string; // ISO 8601 UTC
  previousScheduledAt?: string; // For reschedule events
  formattedDateTime: string; // e.g. "Wednesday, September 16, 2026 at 10:00 AM CT"
  previousFormattedDateTime?: string;
  timezone: string; // e.g. "America/Chicago"
  
  // Lead / Customer details
  leadName: string;
  leadEmail: string;
  leadPhone?: string | null;
  leadCity?: string | null;
  leadBudgetMax?: number | null;
  leadCategory?: QualificationCategory | null;
  leadScore?: number | null;

  // Agent details
  agentName: string;
  agentEmail: string;

  // Property context (if inquiry was attached to a property)
  propertyName?: string | null;
  propertyCity?: string | null;
  propertyPrice?: number | null;

  // Notes & cancellation reasons
  notes?: string | null;
  cancellationReason?: string | null;

  // URLs
  crmLeadUrl?: string; // Private staff-only URL
  publicSupportUrl?: string;
}
