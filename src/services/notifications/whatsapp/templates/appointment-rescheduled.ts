import type {
  AppointmentWhatsAppTemplateData,
  RenderedWhatsAppMessage,
} from "../types";

/**
 * Customer Appointment Rescheduled WhatsApp Message
 */
export function renderCustomerAppointmentRescheduledWhatsApp(
  data: AppointmentWhatsAppTemplateData,
): RenderedWhatsAppMessage {
  const previousTimeText = data.previousFormattedDateTime
    ? `\n⏰ Previous Time: ~${data.previousFormattedDateTime}~`
    : "";

  const propertyInfo = data.propertyName
    ? `\n📍 Property: ${data.propertyName}${data.propertyCity ? ` (${data.propertyCity})` : ""}`
    : "";

  const body = [
    `🏛️ *Aether Estates — Appointment Rescheduled*`,
    ``,
    `Hello ${data.leadName}, your ${data.typeLabel.toLowerCase()} has been updated:${previousTimeText}`,
    `📅 New Date & Time: *${data.formattedDateTime}*`,
    `⏱️ Duration: ${data.durationMinutes} minutes`,
    `👤 Dedicated Agent: *${data.agentName}*${propertyInfo}`,
    ``,
    `We look forward to meeting with you!`,
  ].join("\n");

  return {
    templateName: "appointment_rescheduled_customer",
    body,
    parameters: {
      leadName: data.leadName,
      typeLabel: data.typeLabel,
      formattedDateTime: data.formattedDateTime,
      previousFormattedDateTime: data.previousFormattedDateTime || "",
      agentName: data.agentName,
      propertyName: data.propertyName || "",
    },
  };
}

/**
 * Agent Appointment Rescheduled Alert WhatsApp Message
 */
export function renderAgentAppointmentRescheduledWhatsApp(
  data: AppointmentWhatsAppTemplateData,
): RenderedWhatsAppMessage {
  const previousTimeText = data.previousFormattedDateTime
    ? `\n⏰ Previous Time: ~${data.previousFormattedDateTime}~`
    : "";

  const crmLink = data.crmLeadUrl ? `\n🔗 CRM Link: ${data.crmLeadUrl}` : "";

  const body = [
    `📅 *Aether Estates — Appointment Rescheduled*`,
    ``,
    `Hi ${data.agentName}, an appointment with *${data.leadName}* has been moved:${previousTimeText}`,
    `📅 New Date & Time: *${data.formattedDateTime}*`,
    `⏱️ Duration: ${data.durationMinutes} min (${data.typeLabel})${crmLink}`,
    ``,
    `Your calendar has been updated.`,
  ].join("\n");

  return {
    templateName: "appointment_rescheduled_agent",
    body,
    parameters: {
      agentName: data.agentName,
      leadName: data.leadName,
      formattedDateTime: data.formattedDateTime,
      previousFormattedDateTime: data.previousFormattedDateTime || "",
      crmLeadUrl: data.crmLeadUrl || "",
    },
  };
}
