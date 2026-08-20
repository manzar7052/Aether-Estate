import type { AppointmentEmailTemplateData } from "../types";
import { renderEmailLayout } from "./base-layout";
import { escapeHtml } from "../formatters";

/**
 * Customer email template: Appointment Reminder (24h or 1h).
 */
export function renderCustomerAppointmentReminderEmail(
  data: AppointmentEmailTemplateData,
  offsetLabel: "24h" | "1h" = "24h",
): {
  subject: string;
  html: string;
  text: string;
} {
  const timeDesc =
    offsetLabel === "24h"
      ? "is scheduled for tomorrow"
      : "starts in approximately 1 hour";

  const subject =
    offsetLabel === "24h"
      ? "Reminder: Your Appointment Tomorrow — Aether Estates"
      : "Reminder: Your Appointment in 1 Hour — Aether Estates";

  const escapedName = escapeHtml(data.leadName);
  const escapedAgent = escapeHtml(data.agentName);
  const escapedProperty = escapeHtml(data.propertyName);
  const escapedType = escapeHtml(data.typeLabel);

  const contentHtml = `
    <h2 style="font-family: Georgia, serif; color: #0f172a; margin-top: 0; font-size: 20px;">
      Upcoming Appointment Reminder
    </h2>
    <p>Dear ${escapedName},</p>
    <p>
      This is a friendly reminder that your upcoming appointment with your dedicated licensed agent, <strong>${escapedAgent}</strong>, ${timeDesc}.
    </p>

    <div class="card">
      <p class="card-title">Appointment Summary</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 35%;">Date &amp; Time:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${data.formattedDateTime}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Service Type:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${escapedType} (${data.durationMinutes} min)</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Licensed Agent:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${escapedAgent}</td>
        </tr>
        ${
          data.propertyName
            ? `<tr>
                <td style="padding: 6px 0; color: #64748b;">Property:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${escapedProperty}</td>
              </tr>`
            : ""
        }
      </table>
    </div>

    <p style="font-size: 14px; color: #475569;">
      We look forward to speaking with you. If you need to make any last-minute adjustments, please reach out directly to your agent at <a href="mailto:${data.agentEmail}" style="color: #c5a059; text-decoration: none;">${data.agentEmail}</a>.
    </p>

    <p style="margin-top: 28px; margin-bottom: 0;">
      Warm regards,<br>
      <strong>Aether Estates Concierge</strong>
    </p>
  `;

  const text = `
Upcoming Appointment Reminder — Aether Estates

Dear ${data.leadName},

This is a reminder that your appointment with licensed agent ${data.agentName} ${timeDesc}.

APPOINTMENT SUMMARY:
- Date & Time: ${data.formattedDateTime}
- Service Type: ${data.typeLabel} (${data.durationMinutes} min)
- Licensed Agent: ${data.agentName}
${data.propertyName ? `- Property: ${data.propertyName}\n` : ""}
If you need any assistance, reach out to ${data.agentEmail}.

Warm regards,
Aether Estates Concierge
  `.trim();

  return {
    subject,
    html: renderEmailLayout({
      title: subject,
      preheader: `Reminder: Your appointment with ${data.agentName} is at ${data.formattedDateTime}.`,
      contentHtml,
    }),
    text,
  };
}

/**
 * Agent email template: Appointment Reminder Alert (24h or 1h).
 */
export function renderAgentAppointmentReminderEmail(
  data: AppointmentEmailTemplateData,
  offsetLabel: "24h" | "1h" = "24h",
): {
  subject: string;
  html: string;
  text: string;
} {
  const timeDesc =
    offsetLabel === "24h" ? "is scheduled for tomorrow" : "starts in 1 hour";

  const subject = `Reminder: Upcoming Appointment — ${data.leadName} (${offsetLabel})`;
  const escapedName = escapeHtml(data.leadName);
  const escapedAgent = escapeHtml(data.agentName);
  const escapedProperty = escapeHtml(data.propertyName);
  const escapedType = escapeHtml(data.typeLabel);

  const contentHtml = `
    <h2 style="font-family: Georgia, serif; color: #0f172a; margin-top: 0; font-size: 20px;">
      Appointment Reminder (${offsetLabel.toUpperCase()})
    </h2>
    <p>Hello ${escapedAgent},</p>
    <p>
      Your upcoming appointment with prospect <strong>${escapedName}</strong> ${timeDesc}.
    </p>

    <div class="card">
      <p class="card-title">Appointment &amp; Prospect Context</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 35%;">Date &amp; Time:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${data.formattedDateTime}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Type:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${escapedType} (${data.durationMinutes} min)</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Prospect:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${escapedName} (&lt;${data.leadEmail}&gt;)</td>
        </tr>
        ${
          data.leadPhone
            ? `<tr>
                <td style="padding: 6px 0; color: #64748b;">Phone:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${escapeHtml(data.leadPhone)}</td>
              </tr>`
            : ""
        }
        ${
          data.leadCategory
            ? `<tr>
                <td style="padding: 6px 0; color: #64748b;">Qualification:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #c5a059; text-transform: uppercase;">${data.leadCategory} (${data.leadScore || 0}/100)</td>
              </tr>`
            : ""
        }
        ${
          data.propertyName
            ? `<tr>
                <td style="padding: 6px 0; color: #64748b;">Property:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${escapedProperty}</td>
              </tr>`
            : ""
        }
      </table>
    </div>

    ${
      data.crmLeadUrl
        ? `<div style="text-align: center; margin: 24px 0;">
            <a href="${data.crmLeadUrl}" class="btn">View Lead in CRM</a>
          </div>`
        : ""
    }
  `;

  const text = `
Appointment Reminder (${offsetLabel.toUpperCase()}) — ${data.leadName}

Hello ${data.agentName},

Your appointment with ${data.leadName} ${timeDesc}.

DETAILS:
- Date & Time: ${data.formattedDateTime}
- Type: ${data.typeLabel} (${data.durationMinutes} min)
- Prospect: ${data.leadName} (${data.leadEmail})
${data.leadPhone ? `- Phone: ${data.leadPhone}\n` : ""}${data.leadCategory ? `- Qualification: ${data.leadCategory} (${data.leadScore || 0}/100)\n` : ""}${data.propertyName ? `- Property: ${data.propertyName}\n` : ""}${data.crmLeadUrl ? `\nCRM Link: ${data.crmLeadUrl}\n` : ""}
Aether Estates Operational Platform
  `.trim();

  return {
    subject,
    html: renderEmailLayout({
      title: subject,
      preheader: `Reminder: Appointment with ${data.leadName} is at ${data.formattedDateTime}.`,
      contentHtml,
    }),
    text,
  };
}
