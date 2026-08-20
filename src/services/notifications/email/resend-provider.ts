import type { EmailProvider } from "./provider";
import type { SendEmailOptions, EmailSendResult } from "./types";

/**
 * Resend Email Provider implementation.
 * Uses native fetch against https://api.resend.com/emails.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  private apiKey: string;
  private defaultFrom: string;

  constructor(apiKey?: string, defaultFrom?: string) {
    this.apiKey = apiKey || process.env.RESEND_API_KEY || "";
    this.defaultFrom =
      defaultFrom ||
      process.env.EMAIL_FROM ||
      "Aether Estates <concierge@aetherestates.com>";
  }

  async send(options: SendEmailOptions): Promise<EmailSendResult> {
    if (!this.apiKey) {
      return {
        success: false,
        provider: this.name,
        errorCode: "MISSING_API_KEY",
        error: "RESEND_API_KEY is not configured.",
      };
    }

    const from = options.from || this.defaultFrom;
    const to = Array.isArray(options.to) ? options.to : [options.to];

    try {
      const payload: Record<string, unknown> = {
        from,
        to,
        subject: options.subject,
        html: options.html,
      };

      if (options.text) {
        payload.text = options.text;
      }
      if (options.replyTo) {
        payload.reply_to = options.replyTo;
      }
      if (options.headers) {
        payload.headers = options.headers;
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[ResendEmailProvider] Send failed:", data);
        return {
          success: false,
          provider: this.name,
          errorCode: data.name || "RESEND_API_ERROR",
          error: data.message || "Failed to send email via Resend.",
        };
      }

      return {
        success: true,
        provider: this.name,
        providerMessageId: data.id,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[ResendEmailProvider] Exception:", message);
      return {
        success: false,
        provider: this.name,
        errorCode: "NETWORK_ERROR",
        error: message,
      };
    }
  }
}
