import type {
  AppointmentWhatsAppTemplateData,
  RenderedWhatsAppMessage,
} from "../types";

/**
 * Customer Appointment Confirmed WhatsApp Message
 */
export function renderCustomerAppointmentCreatedWhatsApp(
  data: AppointmentWhatsAppTemplateData,
): RenderedWhatsAppMessage {
  const propertyInfo = data.propertyName
    ? `\n📍 Property: ${data.propertyName}${data.propertyCity ? ` (${data.propertyCity})` : ""}`
    : "";

  const body = [
    `🏛️ *Aether Estates — Appointment Confirmed*`,
    ``,
    `Hello ${data.leadName}, your ${data.typeLabel.toLowerCase()} has been scheduled:`,
    ``,
    `📅 Date & Time: *${data.formattedDateTime}*`,
    `⏱️ Duration: ${data.durationMinutes} minutes`,
    `👤 Dedicated Agent: *${data.agentName}*${propertyInfo}`,
    ``,
    `Need to make changes or have questions? Contact your agent or visit ${data.publicSupportUrl || "https://aether.estate/contact"}.`,
    ``,
    `_Find a place that feels like home._`,
  ].join("\n");

  return {
    templateName: "appointment_created_customer",
    body,
    parameters: {
      leadName: data.leadName,
      typeLabel: data.typeLabel,
      formattedDateTime: data.formattedDateTime,
      agentName: data.agentName,
      propertyName: data.propertyName || "",
    },
  };
}

/**
 * Agent New Appointment Alert WhatsApp Message
 */
export function renderAgentAppointmentCreatedWhatsApp(
  data: AppointmentWhatsAppTemplateData,
): RenderedWhatsAppMessage {
  const propertyInfo = data.propertyName
    ? `\n📍 Property: ${data.propertyName}${data.propertyCity ? ` (${data.propertyCity})` : ""}`
    : "";

  const crmLink = data.crmLeadUrl ? `\n🔗 CRM Link: ${data.crmLeadUrl}` : "";

  const body = [
    `🔔 *Aether Estates — New Appointment Booked*`,
    ``,
    `Hi ${data.agentName}, a new appointment has been scheduled with you:`,
    ``,
    `👤 Client: *${data.leadName}*`,
    `📅 Date & Time: *${data.formattedDateTime}*`,
    `⏱️ Duration: ${data.durationMinutes} min (${data.typeLabel})${propertyInfo}${crmLink}`,
    ``,
    `Please prepare client notes prior to the showing.`,
  ].join("\n");

  return {
    templateName: "appointment_created_agent",
    body,
    parameters: {
      agentName: data.agentName,
      leadName: data.leadName,
      formattedDateTime: data.formattedDateTime,
      typeLabel: data.typeLabel,
      propertyName: data.propertyName || "",
      crmLeadUrl: data.crmLeadUrl || "",
    },
  };
}
