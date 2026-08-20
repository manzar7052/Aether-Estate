import type {
  AppointmentWhatsAppTemplateData,
  RenderedWhatsAppMessage,
} from "../types";

/**
 * Customer Appointment Cancelled WhatsApp Message
 */
export function renderCustomerAppointmentCancelledWhatsApp(
  data: AppointmentWhatsAppTemplateData,
): RenderedWhatsAppMessage {
  const reasonText = data.cancellationReason
    ? `\nℹ️ Reason: ${data.cancellationReason}`
    : "";

  const propertyInfo = data.propertyName
    ? `\n📍 Property: ${data.propertyName}`
    : "";

  const body = [
    `🏛️ *Aether Estates — Appointment Cancelled*`,
    ``,
    `Hello ${data.leadName}, your ${data.typeLabel.toLowerCase()} previously scheduled for *${data.formattedDateTime}* has been cancelled.${reasonText}${propertyInfo}`,
    ``,
    `Whenever you are ready to book another showing or consultation, our team is at your service.`,
    `🌐 Book online: ${data.publicSupportUrl || "https://aether.estate"}`,
  ].join("\n");

  return {
    templateName: "appointment_cancelled_customer",
    body,
    parameters: {
      leadName: data.leadName,
      formattedDateTime: data.formattedDateTime,
      typeLabel: data.typeLabel,
      cancellationReason: data.cancellationReason || "",
    },
  };
}

/**
 * Agent Appointment Cancelled Alert WhatsApp Message
 */
export function renderAgentAppointmentCancelledWhatsApp(
  data: AppointmentWhatsAppTemplateData,
): RenderedWhatsAppMessage {
  const reasonText = data.cancellationReason
    ? `\nℹ️ Reason: ${data.cancellationReason}`
    : "";

  const crmLink = data.crmLeadUrl ? `\n🔗 CRM Link: ${data.crmLeadUrl}` : "";

  const body = [
    `⚠️ *Aether Estates — Appointment Cancelled*`,
    ``,
    `Hi ${data.agentName}, the appointment with *${data.leadName}* on *${data.formattedDateTime}* has been cancelled.${reasonText}${crmLink}`,
    ``,
    `This time slot has been released back into your availability pool.`,
  ].join("\n");

  return {
    templateName: "appointment_cancelled_agent",
    body,
    parameters: {
      agentName: data.agentName,
      leadName: data.leadName,
      formattedDateTime: data.formattedDateTime,
      cancellationReason: data.cancellationReason || "",
      crmLeadUrl: data.crmLeadUrl || "",
    },
  };
}
