import { getCustomEmailProvider, type EmailProvider } from "./provider";
import { ResendEmailProvider } from "./resend-provider";
import { DevLogEmailProvider } from "./dev-provider";
import type { SendEmailOptions, EmailSendResult } from "./types";

let defaultDevProvider: DevLogEmailProvider | null = null;

/**
 * Resolves the active email provider based on configuration and overrides.
 */
export function getEmailProvider(): EmailProvider {
  // 1. Custom mock/injected provider for tests
  const custom = getCustomEmailProvider();
  if (custom) return custom;

  const isProduction = process.env.NODE_ENV === "production";

  // 2. Production Resend provider (in production, or when API key is configured)
  if (isProduction || process.env.RESEND_API_KEY) {
    return new ResendEmailProvider();
  }

  // 3. Fallback DevLog provider strictly for local development and testing
  if (!defaultDevProvider) {
    defaultDevProvider = new DevLogEmailProvider();
  }
  return defaultDevProvider;
}

/**
 * Sends an email through the resolved provider.
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<EmailSendResult> {
  const provider = getEmailProvider();
  const startTime = Date.now();

  try {
    const result = await provider.send(options);
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(
        `[EmailService] Sent to ${Array.isArray(options.to) ? options.to.join(",") : options.to} via ${result.provider} (${duration}ms, ID: ${result.providerMessageId})`,
      );
    } else {
      console.warn(
        `[EmailService] Delivery failed to ${Array.isArray(options.to) ? options.to.join(",") : options.to} via ${result.provider}: ${result.error}`,
      );
    }

    return result;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[EmailService] Unexpected error sending email:`, errorMsg);
    return {
      success: false,
      provider: provider.name,
      errorCode: "UNEXPECTED_ERROR",
      error: errorMsg,
    };
  }
}
