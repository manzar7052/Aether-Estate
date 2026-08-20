import type { AppointmentEmailTemplateData } from "../types";
import { renderEmailLayout } from "./base-layout";
import { escapeHtml } from "../formatters";

/**
 * Customer email template: Appointment Rescheduled.
 */
export function renderCustomerAppointmentRescheduledEmail(data: AppointmentEmailTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Appointment Rescheduled — Aether Estates";
  const escapedName = escapeHtml(data.leadName);
  const escapedAgent = escapeHtml(data.agentName);
  const escapedType = escapeHtml(data.typeLabel);

  const contentHtml = `
    <h2 style="font-family: Georgia, serif; color: #0f172a; margin-top: 0; font-size: 20px;">
      Your Appointment Has Been Rescheduled
    </h2>
    <p>Dear ${escapedName},</p>
    <p>
      Your appointment with licensed agent <strong>${escapedAgent}</strong> has been successfully rescheduled.
    </p>

    <div class="card">
      <p class="card-title">Updated Timing Details</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        ${
          data.previousFormattedDateTime
            ? `<tr>
                <td style="padding: 6px 0; color: #94a3b8; width: 35%; text-decoration: line-through;">Previous Time:</td>
                <td style="padding: 6px 0; color: #94a3b8; text-decoration: line-through;">${data.previousFormattedDateTime}</td>
              </tr>`
            : ""
        }
        <tr>
          <td style="padding: 6px 0; color: #c5a059; font-weight: 700; width: 35%;">New Date &amp; Time:</td>
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
      </table>
    </div>

    <p style="font-size: 14px; color: #475569;">
      If you need further assistance, please contact your agent at <a href="mailto:${data.agentEmail}" style="color: #c5a059; text-decoration: none;">${data.agentEmail}</a>.
    </p>

    <p style="margin-top: 28px; margin-bottom: 0;">
      Warm regards,<br>
      <strong>Aether Estates Concierge</strong>
    </p>
  `;

  const text = `
Appointment Rescheduled — Aether Estates

Dear ${data.leadName},

Your appointment with licensed agent ${data.agentName} has been rescheduled.

UPDATED DETAILS:
${data.previousFormattedDateTime ? `Previous Time: ${data.previousFormattedDateTime}\n` : ""}NEW Time: ${data.formattedDateTime}
Service Type: ${data.typeLabel} (${data.durationMinutes} min)
Licensed Agent: ${data.agentName}

If you need any adjustments, please reach out to ${data.agentEmail}.

Warm regards,
Aether Estates Concierge
  `.trim();

  return {
    subject,
    html: renderEmailLayout({
      title: subject,
      preheader: `Your appointment with ${data.agentName} has been moved to ${data.formattedDateTime}.`,
      contentHtml,
    }),
    text,
  };
}

/**
 * Agent email template: Appointment Rescheduled Alert.
 */
export function renderAgentAppointmentRescheduledEmail(data: AppointmentEmailTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Appointment Rescheduled — ${data.leadName}`;
  const escapedName = escapeHtml(data.leadName);
  const escapedAgent = escapeHtml(data.agentName);
  const escapedType = escapeHtml(data.typeLabel);

  const contentHtml = `
    <h2 style="font-family: Georgia, serif; color: #0f172a; margin-top: 0; font-size: 20px;">
      Appointment Rescheduled
    </h2>
    <p>Hello ${escapedAgent},</p>
    <p>
      The appointment with prospect <strong>${escapedName}</strong> has been updated to a new time.
    </p>

    <div class="card">
      <p class="card-title">Updated Timing</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        ${
          data.previousFormattedDateTime
            ? `<tr>
                <td style="padding: 6px 0; color: #94a3b8; width: 35%; text-decoration: line-through;">Previous:</td>
                <td style="padding: 6px 0; color: #94a3b8; text-decoration: line-through;">${data.previousFormattedDateTime}</td>
              </tr>`
            : ""
        }
        <tr>
          <td style="padding: 6px 0; color: #c5a059; font-weight: 700; width: 35%;">New Date &amp; Time:</td>
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
Appointment Rescheduled — ${data.leadName}

Hello ${data.agentName},

The appointment with ${data.leadName} has been rescheduled.

${data.previousFormattedDateTime ? `Previous Time: ${data.previousFormattedDateTime}\n` : ""}NEW Time: ${data.formattedDateTime}
Type: ${data.typeLabel} (${data.durationMinutes} min)
${data.crmLeadUrl ? `\nCRM Link: ${data.crmLeadUrl}\n` : ""}
Aether Estates Operational Platform
  `.trim();

  return {
    subject,
    html: renderEmailLayout({
      title: subject,
      preheader: `Appointment with ${data.leadName} rescheduled to ${data.formattedDateTime}.`,
      contentHtml,
    }),
    text,
  };
}
