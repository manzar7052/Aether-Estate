import { createServiceRoleClient } from "@/lib/supabase/admin";
import { APPLICATION_TIMEZONE, APPOINTMENT_TYPES, DEFAULT_DURATION } from "@/services/appointments/types";
import { formatAppointmentDateTime } from "../email/formatters";
import { sendEmail } from "../email/service";
import type { AppointmentEmailTemplateData } from "../email/types";
import {
  renderCustomerAppointmentCreatedEmail,
  renderAgentAppointmentCreatedEmail,
} from "../email/templates/appointment-created";
import {
  renderCustomerAppointmentRescheduledEmail,
  renderAgentAppointmentRescheduledEmail,
} from "../email/templates/appointment-rescheduled";
import {
  renderCustomerAppointmentCancelledEmail,
  renderAgentAppointmentCancelledEmail,
} from "../email/templates/appointment-cancelled";
import {
  renderCustomerAppointmentReminderEmail,
  renderAgentAppointmentReminderEmail,
} from "../email/templates/appointment-reminder";
import {
  sendWhatsApp,
  checkCustomerWhatsAppEligibility,
  checkAgentWhatsAppEligibility,
  renderCustomerAppointmentCreatedWhatsApp,
  renderAgentAppointmentCreatedWhatsApp,
  renderCustomerAppointmentRescheduledWhatsApp,
  renderAgentAppointmentRescheduledWhatsApp,
  renderCustomerAppointmentCancelledWhatsApp,
  renderAgentAppointmentCancelledWhatsApp,
  renderCustomerAppointmentReminderWhatsApp,
  renderAgentAppointmentReminderWhatsApp,
  type AppointmentWhatsAppTemplateData,
} from "../whatsapp";
import type { NotificationEvent, NotificationOutcome } from "./types";
import { recordCommunicationLog } from "../logs";

// In-Memory Idempotency Guard (5-minute TTL)
const processedEvents = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

function cleanupIdempotencyCache(): void {
  const now = Date.now();
  for (const [key, timestamp] of processedEvents.entries()) {
    if (now - timestamp > IDEMPOTENCY_TTL_MS) {
      processedEvents.delete(key);
    }
  }
}

export function clearIdempotencyCache(): void {
  processedEvents.clear();
}

/**
 * Dispatches transactional notifications for domain appointment events.
 *
 * Enforces:
 * 1. Idempotency protection against duplicate event emissions.
 * 2. Asynchronous side-effect execution (never fails the calling transaction).
 * 3. Channel router delivering to Email and WhatsApp independently.
 * 4. Explicit WhatsApp consent verification (leads.whatsapp_opt_in === true).
 * 5. Strict failure isolation (Email failure != WhatsApp failure, neither fails business action).
 */
export async function emitNotificationEvent(
  event: NotificationEvent,
): Promise<NotificationOutcome> {
  const outcome: NotificationOutcome = {
    event: event.event,
    appointmentId: event.appointmentId,
    customerEmailSent: false,
    agentEmailSent: false,
    customerWhatsAppSent: false,
    agentWhatsAppSent: false,
  };

  try {
    // 1. Idempotency Check
    cleanupIdempotencyCache();
    const idempotencyKey = `${event.event}:${event.appointmentId}:${event.version || "v1"}`;

    if (processedEvents.has(idempotencyKey)) {
      console.log(
        `[NotificationHandler] Event ${idempotencyKey} already processed. Skipping duplicate emission.`,
      );
      outcome.customerSkippedReason = "Duplicate event skipped by idempotency guard.";
      outcome.agentSkippedReason = "Duplicate event skipped by idempotency guard.";
      outcome.customerWhatsAppSkippedReason = "Duplicate event skipped by idempotency guard.";
      outcome.agentWhatsAppSkippedReason = "Duplicate event skipped by idempotency guard.";
      return outcome;
    }

    processedEvents.set(idempotencyKey, Date.now());

    // 2. Load appointment and related prospect/agent/property data
    const admin = createServiceRoleClient();

    const { data: appointment, error: apptErr } = await admin
      .from("appointments")
      .select("*")
      .eq("id", event.appointmentId)
      .maybeSingle();

    if (apptErr || !appointment) {
      console.warn(
        `[NotificationHandler] Appointment ${event.appointmentId} not found in DB. Skipping notification.`,
      );
      outcome.error = "Appointment not found.";
      return outcome;
    }

    const { data: lead } = await admin
      .from("leads")
      .select("*")
      .eq("id", appointment.lead_id)
      .maybeSingle();

    const { data: agent } = await admin
      .from("profiles")
      .select("*")
      .eq("id", appointment.agent_id)
      .maybeSingle();

    let property = null;
    if (lead?.property_id) {
      const { data: prop } = await admin
        .from("properties")
        .select("id, title, city, price")
        .eq("id", lead.property_id)
        .maybeSingle();
      property = prop;
    }

    // 3. Build Template Data
    const typeLabel =
      APPOINTMENT_TYPES.find((t) => t.type === appointment.type)?.label ||
      appointment.type ||
      "Consultation";

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const leadEmail = lead?.email?.trim() || "";
    const agentEmail = agent?.email?.trim() || "";
    const agentName = agent?.full_name || "Aether Estates Agent";
    const leadName = lead?.full_name || "Valued Prospect";

    const emailTemplateData: AppointmentEmailTemplateData = {
      appointmentId: appointment.id,
      appointmentType: appointment.type || "consultation",
      typeLabel,
      durationMinutes: appointment.duration_minutes || DEFAULT_DURATION,
      scheduledAt: appointment.scheduled_at,
      previousScheduledAt:
        event.event === "appointment.rescheduled"
          ? event.previousScheduledAt
          : undefined,
      formattedDateTime: formatAppointmentDateTime(appointment.scheduled_at),
      previousFormattedDateTime:
        event.event === "appointment.rescheduled" && event.previousScheduledAt
          ? formatAppointmentDateTime(event.previousScheduledAt)
          : undefined,
      timezone: APPLICATION_TIMEZONE,
      leadName,
      leadEmail,
      leadPhone: lead?.phone || null,
      leadCity: lead?.city || null,
      leadBudgetMax: lead?.budget_max || null,
      leadCategory: lead?.qualification_category || null,
      leadScore: lead?.lead_score || null,
      agentName,
      agentEmail,
      propertyName: property?.title || null,
      propertyCity: property?.city || null,
      propertyPrice: property?.price || null,
      notes: appointment.notes || null,
      cancellationReason:
        event.event === "appointment.cancelled" ? event.reason : null,
      crmLeadUrl: leadEmail
        ? `${appUrl}/dashboard/leads?search=${encodeURIComponent(leadEmail)}`
        : undefined,
      publicSupportUrl: `${appUrl}/contact`,
    };

    const whatsAppTemplateData: AppointmentWhatsAppTemplateData = {
      appointmentId: appointment.id,
      appointmentType: appointment.type || "consultation",
      typeLabel,
      durationMinutes: appointment.duration_minutes || DEFAULT_DURATION,
      scheduledAt: appointment.scheduled_at,
      previousScheduledAt:
        event.event === "appointment.rescheduled"
          ? event.previousScheduledAt
          : undefined,
      formattedDateTime: formatAppointmentDateTime(appointment.scheduled_at),
      previousFormattedDateTime:
        event.event === "appointment.rescheduled" && event.previousScheduledAt
          ? formatAppointmentDateTime(event.previousScheduledAt)
          : undefined,
      timezone: APPLICATION_TIMEZONE,
      leadName,
      leadPhone: lead?.phone || null,
      agentName,
      agentPhone: agent?.phone || null,
      propertyName: property?.title || null,
      propertyCity: property?.city || null,
      propertyPrice: property?.price || null,
      cancellationReason:
        event.event === "appointment.cancelled" ? event.reason : null,
      crmLeadUrl: leadEmail
        ? `${appUrl}/dashboard/leads?search=${encodeURIComponent(leadEmail)}`
        : undefined,
      publicSupportUrl: `${appUrl}/contact`,
    };

    // =========================================================================
    // CHANNEL 1: EMAIL DISPATCH (Independent Side Effect)
    // =========================================================================
    try {
      if (event.event === "appointment.created") {
        const custTemplate = "appointment_created_customer";
        const agentTemplate = "appointment_created_agent";

        if (leadEmail && leadEmail.includes("@")) {
          const customerMsg = renderCustomerAppointmentCreatedEmail(emailTemplateData);
          const sendRes = await sendEmail({
            to: leadEmail,
            subject: customerMsg.subject,
            html: customerMsg.html,
            text: customerMsg.text,
          });
          outcome.customerEmailSent = sendRes.success;

          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "customer",
            recipient: leadEmail,
            status: sendRes.success ? "sent" : "failed",
            template: custTemplate,
            providerMessageId: sendRes.providerMessageId,
            errorCode: sendRes.success ? undefined : sendRes.errorCode || "PROVIDER_TEMPORARY_ERROR",
            errorMessage: sendRes.success ? undefined : sendRes.error,
            metadata: { subject: customerMsg.subject },
          });
        } else {
          outcome.customerSkippedReason = "Missing or invalid customer email.";
          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "customer",
            recipient: leadEmail || "none",
            status: "skipped",
            template: custTemplate,
            errorCode: "MISSING_EMAIL",
            errorMessage: "Missing or invalid customer email.",
          });
        }

        if (agentEmail && agentEmail.includes("@")) {
          const agentMsg = renderAgentAppointmentCreatedEmail(emailTemplateData);
          const sendRes = await sendEmail({
            to: agentEmail,
            subject: agentMsg.subject,
            html: agentMsg.html,
            text: agentMsg.text,
          });
          outcome.agentEmailSent = sendRes.success;

          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "agent",
            recipient: agentEmail,
            status: sendRes.success ? "sent" : "failed",
            template: agentTemplate,
            providerMessageId: sendRes.providerMessageId,
            errorCode: sendRes.success ? undefined : sendRes.errorCode || "PROVIDER_TEMPORARY_ERROR",
            errorMessage: sendRes.success ? undefined : sendRes.error,
            metadata: { subject: agentMsg.subject },
          });
        } else {
          outcome.agentSkippedReason = "Missing agent email.";
          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "agent",
            recipient: agentEmail || "none",
            status: "skipped",
            template: agentTemplate,
            errorCode: "MISSING_EMAIL",
            errorMessage: "Missing agent email.",
          });
        }
      } else if (event.event === "appointment.rescheduled") {
        const custTemplate = "appointment_rescheduled_customer";
        const agentTemplate = "appointment_rescheduled_agent";

        if (leadEmail && leadEmail.includes("@")) {
          const customerMsg = renderCustomerAppointmentRescheduledEmail(emailTemplateData);
          const sendRes = await sendEmail({
            to: leadEmail,
            subject: customerMsg.subject,
            html: customerMsg.html,
            text: customerMsg.text,
          });
          outcome.customerEmailSent = sendRes.success;

          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "customer",
            recipient: leadEmail,
            status: sendRes.success ? "sent" : "failed",
            template: custTemplate,
            providerMessageId: sendRes.providerMessageId,
            errorCode: sendRes.success ? undefined : sendRes.errorCode || "PROVIDER_TEMPORARY_ERROR",
            errorMessage: sendRes.success ? undefined : sendRes.error,
            metadata: { subject: customerMsg.subject },
          });
        } else {
          outcome.customerSkippedReason = "Missing customer email.";
          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "customer",
            recipient: leadEmail || "none",
            status: "skipped",
            template: custTemplate,
            errorCode: "MISSING_EMAIL",
            errorMessage: "Missing customer email.",
          });
        }

        if (agentEmail && agentEmail.includes("@")) {
          const agentMsg = renderAgentAppointmentRescheduledEmail(emailTemplateData);
          const sendRes = await sendEmail({
            to: agentEmail,
            subject: agentMsg.subject,
            html: agentMsg.html,
            text: agentMsg.text,
          });
          outcome.agentEmailSent = sendRes.success;

          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "agent",
            recipient: agentEmail,
            status: sendRes.success ? "sent" : "failed",
            template: agentTemplate,
            providerMessageId: sendRes.providerMessageId,
            errorCode: sendRes.success ? undefined : sendRes.errorCode || "PROVIDER_TEMPORARY_ERROR",
            errorMessage: sendRes.success ? undefined : sendRes.error,
            metadata: { subject: agentMsg.subject },
          });
        } else {
          outcome.agentSkippedReason = "Missing agent email.";
          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "agent",
            recipient: agentEmail || "none",
            status: "skipped",
            template: agentTemplate,
            errorCode: "MISSING_EMAIL",
            errorMessage: "Missing agent email.",
          });
        }
      } else if (event.event === "appointment.cancelled") {
        const custTemplate = "appointment_cancelled_customer";
        const agentTemplate = "appointment_cancelled_agent";

        if (leadEmail && leadEmail.includes("@")) {
          const customerMsg = renderCustomerAppointmentCancelledEmail(emailTemplateData);
          const sendRes = await sendEmail({
            to: leadEmail,
            subject: customerMsg.subject,
            html: customerMsg.html,
            text: customerMsg.text,
          });
          outcome.customerEmailSent = sendRes.success;

          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "customer",
            recipient: leadEmail,
            status: sendRes.success ? "sent" : "failed",
            template: custTemplate,
            providerMessageId: sendRes.providerMessageId,
            errorCode: sendRes.success ? undefined : sendRes.errorCode || "PROVIDER_TEMPORARY_ERROR",
            errorMessage: sendRes.success ? undefined : sendRes.error,
            metadata: { subject: customerMsg.subject },
          });
        } else {
          outcome.customerSkippedReason = "Missing customer email.";
          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "customer",
            recipient: leadEmail || "none",
            status: "skipped",
            template: custTemplate,
            errorCode: "MISSING_EMAIL",
            errorMessage: "Missing customer email.",
          });
        }

        if (agentEmail && agentEmail.includes("@")) {
          const agentMsg = renderAgentAppointmentCancelledEmail(emailTemplateData);
          const sendRes = await sendEmail({
            to: agentEmail,
            subject: agentMsg.subject,
            html: agentMsg.html,
            text: agentMsg.text,
          });
          outcome.agentEmailSent = sendRes.success;

          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "agent",
            recipient: agentEmail,
            status: sendRes.success ? "sent" : "failed",
            template: agentTemplate,
            providerMessageId: sendRes.providerMessageId,
            errorCode: sendRes.success ? undefined : sendRes.errorCode || "PROVIDER_TEMPORARY_ERROR",
            errorMessage: sendRes.success ? undefined : sendRes.error,
            metadata: { subject: agentMsg.subject },
          });
        } else {
          outcome.agentSkippedReason = "Missing agent email.";
          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "agent",
            recipient: agentEmail || "none",
            status: "skipped",
            template: agentTemplate,
            errorCode: "MISSING_EMAIL",
            errorMessage: "Missing agent email.",
          });
        }
      } else if (
        event.event === "appointment.reminder_24h" ||
        event.event === "appointment.reminder_1h"
      ) {
        const offsetLabel =
          event.event === "appointment.reminder_24h" ? "24h" : "1h";
        const custTemplate = `appointment_reminder_${offsetLabel}_customer`;
        const agentTemplate = `appointment_reminder_${offsetLabel}_agent`;

        if (leadEmail && leadEmail.includes("@")) {
          const customerMsg = renderCustomerAppointmentReminderEmail(
            emailTemplateData,
            offsetLabel,
          );
          const sendRes = await sendEmail({
            to: leadEmail,
            subject: customerMsg.subject,
            html: customerMsg.html,
            text: customerMsg.text,
          });
          outcome.customerEmailSent = sendRes.success;

          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "customer",
            recipient: leadEmail,
            status: sendRes.success ? "sent" : "failed",
            template: custTemplate,
            providerMessageId: sendRes.providerMessageId,
            errorCode: sendRes.success ? undefined : sendRes.errorCode || "PROVIDER_TEMPORARY_ERROR",
            errorMessage: sendRes.success ? undefined : sendRes.error,
            metadata: { subject: customerMsg.subject, offsetLabel },
          });
        } else {
          outcome.customerSkippedReason = "Missing customer email.";
          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "customer",
            recipient: leadEmail || "none",
            status: "skipped",
            template: custTemplate,
            errorCode: "MISSING_EMAIL",
            errorMessage: "Missing customer email.",
          });
        }

        if (agentEmail && agentEmail.includes("@")) {
          const agentMsg = renderAgentAppointmentReminderEmail(
            emailTemplateData,
            offsetLabel,
          );
          const sendRes = await sendEmail({
            to: agentEmail,
            subject: agentMsg.subject,
            html: agentMsg.html,
            text: agentMsg.text,
          });
          outcome.agentEmailSent = sendRes.success;

          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "agent",
            recipient: agentEmail,
            status: sendRes.success ? "sent" : "failed",
            template: agentTemplate,
            providerMessageId: sendRes.providerMessageId,
            errorCode: sendRes.success ? undefined : sendRes.errorCode || "PROVIDER_TEMPORARY_ERROR",
            errorMessage: sendRes.success ? undefined : sendRes.error,
            metadata: { subject: agentMsg.subject, offsetLabel },
          });
        } else {
          outcome.agentSkippedReason = "Missing agent email.";
          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "email",
            eventType: event.event,
            recipientType: "agent",
            recipient: agentEmail || "none",
            status: "skipped",
            template: agentTemplate,
            errorCode: "MISSING_EMAIL",
            errorMessage: "Missing agent email.",
          });
        }
      }
    } catch (emailErr) {
      console.error(`[NotificationHandler] Email channel dispatch error:`, emailErr);
    }

    // =========================================================================
    // CHANNEL 2: WHATSAPP DISPATCH (Independent Side Effect)
    // =========================================================================
    try {
      // 1. Customer WhatsApp Eligibility & Send
      const customerEligibility = checkCustomerWhatsAppEligibility(lead);
      if (customerEligibility.eligible && customerEligibility.normalizedPhone) {
        let customerMsg;
        if (event.event === "appointment.created") {
          customerMsg = renderCustomerAppointmentCreatedWhatsApp(whatsAppTemplateData);
        } else if (event.event === "appointment.rescheduled") {
          customerMsg = renderCustomerAppointmentRescheduledWhatsApp(whatsAppTemplateData);
        } else if (event.event === "appointment.cancelled") {
          customerMsg = renderCustomerAppointmentCancelledWhatsApp(whatsAppTemplateData);
        } else if (
          event.event === "appointment.reminder_24h" ||
          event.event === "appointment.reminder_1h"
        ) {
          const offsetLabel =
            event.event === "appointment.reminder_24h" ? "24h" : "1h";
          customerMsg = renderCustomerAppointmentReminderWhatsApp(
            whatsAppTemplateData,
            offsetLabel,
          );
        }

        if (customerMsg) {
          const waRes = await sendWhatsApp({
            to: customerEligibility.normalizedPhone,
            body: customerMsg.body,
            templateName: customerMsg.templateName,
            parameters: customerMsg.parameters,
          });
          outcome.customerWhatsAppSent = waRes.success;
          if (!waRes.success) {
            outcome.customerWhatsAppSkippedReason = waRes.errorMessage || waRes.errorCode;
          }

          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "whatsapp",
            eventType: event.event,
            recipientType: "customer",
            recipient: customerEligibility.normalizedPhone,
            status: waRes.success ? "sent" : "failed",
            template: customerMsg.templateName,
            providerMessageId: waRes.providerMessageId,
            errorCode: waRes.success ? undefined : waRes.errorCode || "PROVIDER_TEMPORARY_ERROR",
            errorMessage: waRes.success ? undefined : waRes.errorMessage,
          });
        }
      } else {
        outcome.customerWhatsAppSkippedReason = customerEligibility.reason || "NOT_ELIGIBLE";
        await recordCommunicationLog({
          leadId: appointment.lead_id,
          appointmentId: appointment.id,
          channel: "whatsapp",
          eventType: event.event,
          recipientType: "customer",
          recipient: lead?.phone || "none",
          status: "skipped",
          errorCode: customerEligibility.reason || "NOT_ELIGIBLE",
          errorMessage: `Skipped: ${customerEligibility.reason || "NOT_ELIGIBLE"}`,
        });
      }

      // 2. Agent WhatsApp Eligibility & Send
      const agentEligibility = checkAgentWhatsAppEligibility(agent);
      if (agentEligibility.eligible && agentEligibility.normalizedPhone) {
        let agentMsg;
        if (event.event === "appointment.created") {
          agentMsg = renderAgentAppointmentCreatedWhatsApp(whatsAppTemplateData);
        } else if (event.event === "appointment.rescheduled") {
          agentMsg = renderAgentAppointmentRescheduledWhatsApp(whatsAppTemplateData);
        } else if (event.event === "appointment.cancelled") {
          agentMsg = renderAgentAppointmentCancelledWhatsApp(whatsAppTemplateData);
        } else if (
          event.event === "appointment.reminder_24h" ||
          event.event === "appointment.reminder_1h"
        ) {
          const offsetLabel =
            event.event === "appointment.reminder_24h" ? "24h" : "1h";
          agentMsg = renderAgentAppointmentReminderWhatsApp(
            whatsAppTemplateData,
            offsetLabel,
          );
        }

        if (agentMsg) {
          const waRes = await sendWhatsApp({
            to: agentEligibility.normalizedPhone,
            body: agentMsg.body,
            templateName: agentMsg.templateName,
            parameters: agentMsg.parameters,
          });
          outcome.agentWhatsAppSent = waRes.success;
          if (!waRes.success) {
            outcome.agentWhatsAppSkippedReason = waRes.errorMessage || waRes.errorCode;
          }

          await recordCommunicationLog({
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            channel: "whatsapp",
            eventType: event.event,
            recipientType: "agent",
            recipient: agentEligibility.normalizedPhone,
            status: waRes.success ? "sent" : "failed",
            template: agentMsg.templateName,
            providerMessageId: waRes.providerMessageId,
            errorCode: waRes.success ? undefined : waRes.errorCode || "PROVIDER_TEMPORARY_ERROR",
            errorMessage: waRes.success ? undefined : waRes.errorMessage,
          });
        }
      } else {
        outcome.agentWhatsAppSkippedReason = agentEligibility.reason || "NOT_ELIGIBLE";
        await recordCommunicationLog({
          leadId: appointment.lead_id,
          appointmentId: appointment.id,
          channel: "whatsapp",
          eventType: event.event,
          recipientType: "agent",
          recipient: agent?.phone || "none",
          status: "skipped",
          errorCode: agentEligibility.reason || "NOT_ELIGIBLE",
          errorMessage: `Skipped: ${agentEligibility.reason || "NOT_ELIGIBLE"}`,
        });
      }
    } catch (waErr) {
      console.error(`[NotificationHandler] WhatsApp channel dispatch error:`, waErr);
    }

    return outcome;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[NotificationHandler] Uncaught error processing event ${event.event}:`, message);
    outcome.error = message;
    return outcome;
  }
}
