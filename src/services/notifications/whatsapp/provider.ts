/**
 * WhatsApp Provider Abstraction — Phase 6C
 * Supports Twilio WhatsApp in production and DevLog mock provider in dev/test.
 */

import { maskPhoneNumber } from "./phone";
import type {
  SendWhatsAppOptions,
  WhatsAppProvider,
  WhatsAppSendResult,
  WhatsAppErrorCode,
} from "./types";

/**
 * Production Twilio WhatsApp Provider via REST API.
 */
export class TwilioWhatsAppProvider implements WhatsAppProvider {
  readonly name = "twilio-whatsapp";

  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;

  constructor(options?: { accountSid?: string; authToken?: string; fromNumber?: string }) {
    this.accountSid = options?.accountSid || process.env.TWILIO_ACCOUNT_SID || "";
    this.authToken = options?.authToken || process.env.TWILIO_AUTH_TOKEN || "";
    this.fromNumber = options?.fromNumber || process.env.TWILIO_WHATSAPP_FROM || "+14155238886"; // Twilio sandbox default
  }

  async send(options: SendWhatsAppOptions): Promise<WhatsAppSendResult> {
    if (!this.accountSid || !this.authToken) {
      return {
        success: false,
        errorCode: "PROVIDER_AUTH_ERROR",
        errorMessage: "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is not configured.",
      };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");

      const params = new URLSearchParams();
      params.append("To", options.to.startsWith("whatsapp:") ? options.to : `whatsapp:${options.to}`);
      params.append(
        "From",
        this.fromNumber.startsWith("whatsapp:") ? this.fromNumber : `whatsapp:${this.fromNumber}`,
      );
      params.append("Body", options.body);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorCode: WhatsAppErrorCode = "UNKNOWN";
        if (response.status === 401 || response.status === 403) {
          errorCode = "PROVIDER_AUTH_ERROR";
        } else if (response.status === 429) {
          errorCode = "PROVIDER_RATE_LIMIT";
        } else if (response.status >= 500) {
          errorCode = "PROVIDER_TEMPORARY_ERROR";
        }

        return {
          success: false,
          errorCode,
          errorMessage: data.message || `Twilio HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        providerMessageId: data.sid,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        errorCode: "PROVIDER_TEMPORARY_ERROR",
        errorMessage: message,
      };
    }
  }
}

/**
 * Development & Testing Mock Provider.
 * Captures sent messages in memory and prints styled preview to the terminal.
 */
export class DevLogWhatsAppProvider implements WhatsAppProvider {
  readonly name = "dev-logger";

  private sentMessages: Array<SendWhatsAppOptions & { id: string; timestamp: string }> = [];
  private simulateFailure = false;
  private failureError: string | null = null;
  private failureErrorCode: WhatsAppErrorCode = "PROVIDER_TEMPORARY_ERROR";

  setSimulatedFailure(fail: boolean, error?: string, code?: WhatsAppErrorCode): void {
    this.simulateFailure = fail;
    this.failureError = error || (fail ? "Simulated WhatsApp Provider Failure" : null);
    this.failureErrorCode = code || "PROVIDER_TEMPORARY_ERROR";
  }

  getSentMessages() {
    return [...this.sentMessages];
  }

  clear() {
    this.sentMessages = [];
    this.simulateFailure = false;
    this.failureError = null;
  }

  async send(options: SendWhatsAppOptions): Promise<WhatsAppSendResult> {
    if (this.simulateFailure) {
      console.log(
        `[WhatsAppService] Delivery failed to ${maskPhoneNumber(options.to)} via ${this.name}: ${this.failureError}`,
      );
      return {
        success: false,
        errorCode: this.failureErrorCode,
        errorMessage: this.failureError || "Simulated Provider Error",
      };
    }

    const messageId = `mock_wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.sentMessages.push({
      ...options,
      id: messageId,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[WhatsAppService] Sent to ${maskPhoneNumber(options.to)} via ${this.name} (ID: ${messageId})\n  Template: ${options.templateName || "custom"}\n  Preview: ${options.body.split("\n")[0]}...`,
    );

    return {
      success: true,
      providerMessageId: messageId,
    };
  }
}

let activeProvider: WhatsAppProvider | null = null;

export function getWhatsAppProvider(): WhatsAppProvider {
  if (activeProvider) {
    return activeProvider;
  }

  const isProduction = process.env.NODE_ENV === "production";

  // In production, strictly select TwilioWhatsAppProvider (returns explicit error if unconfigured)
  if (isProduction) {
    return new TwilioWhatsAppProvider();
  }

  // Fallback DevLog provider strictly for local development and testing
  return new DevLogWhatsAppProvider();
}

export function setCustomWhatsAppProvider(provider: WhatsAppProvider | null): void {
  activeProvider = provider;
}
