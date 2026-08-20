import type { AppointmentEmailTemplateData } from "../types";
import { renderEmailLayout } from "./base-layout";
import { escapeHtml } from "../formatters";

/**
 * Customer email template: Appointment Confirmation.
 */
export function renderCustomerAppointmentCreatedEmail(data: AppointmentEmailTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Appointment Confirmed — Aether Estates";
  const escapedName = escapeHtml(data.leadName);
  const escapedAgent = escapeHtml(data.agentName);
  const escapedProperty = escapeHtml(data.propertyName);
  const escapedType = escapeHtml(data.typeLabel);

  const contentHtml = `
    <h2 style="font-family: Georgia, serif; color: #0f172a; margin-top: 0; font-size: 20px;">
      Your Appointment is Confirmed
    </h2>
    <p>Dear ${escapedName},</p>
    <p>
      Thank you for connecting with Aether Estates. We are pleased to confirm your upcoming appointment with your dedicated licensed agent, <strong>${escapedAgent}</strong>.
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
      If you need to reschedule or have any questions ahead of your appointment, please reply directly to this email or reach out to your agent at <a href="mailto:${data.agentEmail}" style="color: #c5a059; text-decoration: none;">${data.agentEmail}</a>.
    </p>

    <p style="margin-top: 28px; margin-bottom: 0;">
      Warm regards,<br>
      <strong>Aether Estates Concierge</strong>
    </p>
  `;

  const text = `
Appointment Confirmed — Aether Estates

Dear ${data.leadName},

Thank you for connecting with Aether Estates. We are pleased to confirm your upcoming appointment with your dedicated licensed agent, ${data.agentName}.

APPOINTMENT SUMMARY:
- Date & Time: ${data.formattedDateTime}
- Service Type: ${data.typeLabel} (${data.durationMinutes} min)
- Licensed Agent: ${data.agentName}
${data.propertyName ? `- Property: ${data.propertyName}\n` : ""}
If you need to reschedule or have any questions ahead of your appointment, please reach out to ${data.agentEmail}.

Warm regards,
Aether Estates Concierge
  `.trim();

  return {
    subject,
    html: renderEmailLayout({
      title: subject,
      preheader: `Your appointment with ${data.agentName} is confirmed for ${data.formattedDateTime}.`,
      contentHtml,
    }),
    text,
  };
}

/**
 * Agent email template: New Scheduled Appointment Alert.
 */
export function renderAgentAppointmentCreatedEmail(data: AppointmentEmailTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `New Appointment Scheduled — ${data.leadName}`;
  const escapedName = escapeHtml(data.leadName);
  const escapedAgent = escapeHtml(data.agentName);
  const escapedProperty = escapeHtml(data.propertyName);
  const escapedType = escapeHtml(data.typeLabel);
  const escapedCity = escapeHtml(data.leadCity);

  const contentHtml = `
    <h2 style="font-family: Georgia, serif; color: #0f172a; margin-top: 0; font-size: 20px;">
      New Appointment Scheduled
    </h2>
    <p>Hello ${escapedAgent},</p>
    <p>
      A new appointment has been scheduled with prospect <strong>${escapedName}</strong>.
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
        ${
          data.leadCity
            ? `<tr>
                <td style="padding: 6px 0; color: #64748b;">Target Market:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${escapedCity}</td>
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

    <p style="font-size: 13px; color: #64748b;">
      Please review the lead file in your CRM workspace before the session.
    </p>
  `;

  const text = `
New Appointment Scheduled — ${data.leadName}

Hello ${data.agentName},

A new appointment has been scheduled with prospect ${data.leadName}.

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
      preheader: `New appointment with ${data.leadName} scheduled for ${data.formattedDateTime}.`,
      contentHtml,
    }),
    text,
  };
}
