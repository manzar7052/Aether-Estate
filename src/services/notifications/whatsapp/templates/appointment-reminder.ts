import type {
  AppointmentWhatsAppTemplateData,
  RenderedWhatsAppMessage,
} from "../types";

/**
 * Customer Appointment Reminder WhatsApp Message (24h & 1h)
 */
export function renderCustomerAppointmentReminderWhatsApp(
  data: AppointmentWhatsAppTemplateData,
  offsetLabel: "24h" | "1h",
): RenderedWhatsAppMessage {
  const propertyInfo = data.propertyName
    ? `\n📍 Location: ${data.propertyName}${data.propertyCity ? ` (${data.propertyCity})` : ""}`
    : "";

  if (offsetLabel === "1h") {
    const body = [
      `⏰ *Reminder: Showing in 1 Hour — Aether Estates*`,
      ``,
      `Hello ${data.leadName}, your ${data.typeLabel.toLowerCase()} starts in one hour at *${data.formattedDateTime}*.`,
      `👤 Dedicated Agent: *${data.agentName}*${propertyInfo}`,
      ``,
      `See you shortly!`,
    ].join("\n");

    return {
      templateName: "appointment_reminder_1h_customer",
      body,
      parameters: {
        leadName: data.leadName,
        formattedDateTime: data.formattedDateTime,
        agentName: data.agentName,
        propertyName: data.propertyName || "",
      },
    };
  }

  // 24h reminder default
  const body = [
    `🏛️ *Reminder: Your Showing Tomorrow — Aether Estates*`,
    ``,
    `Hello ${data.leadName}, this is a friendly reminder for your upcoming ${data.typeLabel.toLowerCase()}:`,
    ``,
    `📅 Date & Time: *${data.formattedDateTime}*`,
    `⏱️ Duration: ${data.durationMinutes} minutes`,
    `👤 Dedicated Agent: *${data.agentName}*${propertyInfo}`,
    ``,
    `Please reach out if you need to adjust your schedule.`,
    `_Find a place that feels like home._`,
  ].join("\n");

  return {
    templateName: "appointment_reminder_24h_customer",
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
 * Agent Appointment Reminder Alert WhatsApp Message (24h & 1h)
 */
export function renderAgentAppointmentReminderWhatsApp(
  data: AppointmentWhatsAppTemplateData,
  offsetLabel: "24h" | "1h",
): RenderedWhatsAppMessage {
  const propertyInfo = data.propertyName
    ? `\n📍 Property: ${data.propertyName}`
    : "";

  const crmLink = data.crmLeadUrl ? `\n🔗 CRM Link: ${data.crmLeadUrl}` : "";

  if (offsetLabel === "1h") {
    const body = [
      `⏰ *Upcoming Showing in 1 Hour*`,
      ``,
      `Hi ${data.agentName}, your appointment with *${data.leadName}* starts in 1 hour at *${data.formattedDateTime}*.${propertyInfo}${crmLink}`,
    ].join("\n");

    return {
      templateName: "appointment_reminder_1h_agent",
      body,
      parameters: {
        agentName: data.agentName,
        leadName: data.leadName,
        formattedDateTime: data.formattedDateTime,
        crmLeadUrl: data.crmLeadUrl || "",
      },
    };
  }

  // 24h reminder
  const body = [
    `🔔 *Showing Reminder: Tomorrow*`,
    ``,
    `Hi ${data.agentName}, you have an appointment tomorrow with *${data.leadName}*:`,
    `📅 Time: *${data.formattedDateTime}* (${data.durationMinutes} min)${propertyInfo}${crmLink}`,
  ].join("\n");

  return {
    templateName: "appointment_reminder_24h_agent",
    body,
    parameters: {
      agentName: data.agentName,
      leadName: data.leadName,
      formattedDateTime: data.formattedDateTime,
      crmLeadUrl: data.crmLeadUrl || "",
    },
  };
}
