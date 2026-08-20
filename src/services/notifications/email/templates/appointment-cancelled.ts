import type { AppointmentEmailTemplateData } from "../types";
import { renderEmailLayout } from "./base-layout";
import { escapeHtml } from "../formatters";

/**
 * Customer email template: Appointment Cancelled.
 */
export function renderCustomerAppointmentCancelledEmail(data: AppointmentEmailTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Appointment Cancelled — Aether Estates";
  const escapedName = escapeHtml(data.leadName);
  const escapedAgent = escapeHtml(data.agentName);
  const escapedReason = escapeHtml(data.cancellationReason);

  const contentHtml = `
    <h2 style="font-family: Georgia, serif; color: #0f172a; margin-top: 0; font-size: 20px;">
      Appointment Cancellation Notice
    </h2>
    <p>Dear ${escapedName},</p>
    <p>
      Your appointment with licensed agent <strong>${escapedAgent}</strong> scheduled for <strong>${data.formattedDateTime}</strong> has been cancelled.
    </p>

    <div class="card">
      <p class="card-title">Cancellation Summary</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 35%;">Cancelled Slot:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${data.formattedDateTime}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Status:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #e11d48; text-transform: uppercase;">Cancelled</td>
        </tr>
        ${
          data.cancellationReason
            ? `<tr>
                <td style="padding: 6px 0; color: #64748b;">Reason:</td>
                <td style="padding: 6px 0; color: #0f172a; font-style: italic;">${escapedReason}</td>
              </tr>`
            : ""
        }
      </table>
    </div>

    <p style="font-size: 14px; color: #475569;">
      If you would like to book a new appointment in the future or speak with a concierge specialist, please visit our website or reply directly to this email.
    </p>

    <p style="margin-top: 28px; margin-bottom: 0;">
      Warm regards,<br>
      <strong>Aether Estates Concierge</strong>
    </p>
  `;

  const text = `
Appointment Cancelled — Aether Estates

Dear ${data.leadName},

Your appointment with ${data.agentName} scheduled for ${data.formattedDateTime} has been cancelled.

Status: Cancelled
${data.cancellationReason ? `Reason: ${data.cancellationReason}\n` : ""}
If you would like to book another time, please contact us or reply to this email.

Warm regards,
Aether Estates Concierge
  `.trim();

  return {
    subject,
    html: renderEmailLayout({
      title: subject,
      preheader: `Your appointment with ${data.agentName} has been cancelled.`,
      contentHtml,
    }),
    text,
  };
}

/**
 * Agent email template: Appointment Cancelled Alert.
 */
export function renderAgentAppointmentCancelledEmail(data: AppointmentEmailTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Appointment Cancelled — ${data.leadName}`;
  const escapedName = escapeHtml(data.leadName);
  const escapedAgent = escapeHtml(data.agentName);
  const escapedReason = escapeHtml(data.cancellationReason);

  const contentHtml = `
    <h2 style="font-family: Georgia, serif; color: #0f172a; margin-top: 0; font-size: 20px;">
      Appointment Cancelled
    </h2>
    <p>Hello ${escapedAgent},</p>
    <p>
      The appointment with prospect <strong>${escapedName}</strong> previously scheduled for <strong>${data.formattedDateTime}</strong> has been cancelled.
    </p>

    <div class="card">
      <p class="card-title">Details</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 35%;">Released Slot:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${data.formattedDateTime}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Prospect:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${escapedName} (&lt;${data.leadEmail}&gt;)</td>
        </tr>
        ${
          data.cancellationReason
            ? `<tr>
                <td style="padding: 6px 0; color: #64748b;">Reason:</td>
                <td style="padding: 6px 0; color: #0f172a; font-style: italic;">${escapedReason}</td>
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
Appointment Cancelled — ${data.leadName}

Hello ${data.agentName},

The appointment with ${data.leadName} scheduled for ${data.formattedDateTime} has been cancelled.
${data.cancellationReason ? `Reason: ${data.cancellationReason}\n` : ""}${data.crmLeadUrl ? `\nCRM Link: ${data.crmLeadUrl}\n` : ""}
Aether Estates Operational Platform
  `.trim();

  return {
    subject,
    html: renderEmailLayout({
      title: subject,
      preheader: `Appointment with ${data.leadName} (${data.formattedDateTime}) has been cancelled.`,
      contentHtml,
    }),
    text,
  };
}
