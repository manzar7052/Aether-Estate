import type { EmailProvider } from "./provider";
import type { SendEmailOptions, EmailSendResult } from "./types";

export interface RecordedEmail {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  text?: string;
  timestamp: string;
}

/**
 * Dev / Mock Email Provider.
 * Safely captures emails in memory and logs clean previews for development and automated testing.
 */
export class DevLogEmailProvider implements EmailProvider {
  readonly name = "dev-logger";
  private sentEmails: RecordedEmail[] = [];
  private shouldFail: boolean = false;
  private failureError: string = "Simulated provider outage";

  constructor(private silent: boolean = false) {}

  setSimulatedFailure(shouldFail: boolean, errorMsg?: string): void {
    this.shouldFail = shouldFail;
    if (errorMsg) this.failureError = errorMsg;
  }

  async send(options: SendEmailOptions): Promise<EmailSendResult> {
    if (this.shouldFail) {
      return {
        success: false,
        provider: this.name,
        errorCode: "SIMULATED_PROVIDER_FAILURE",
        error: this.failureError,
      };
    }

    const recorded: RecordedEmail = {
      to: options.to,
      from: options.from || "concierge@aetherestates.com",
      subject: options.subject,
      html: options.html,
      text: options.text,
      timestamp: new Date().toISOString(),
    };

    this.sentEmails.push(recorded);
    const mockId = `mock_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (!this.silent) {
      const recipient = Array.isArray(options.to) ? options.to.join(", ") : options.to;
      console.log(`\n📧 [EMAIL PREVIEW / DEV LOGGED] → To: ${recipient}`);
      console.log(`   Subject: ${options.subject}`);
      console.log(`   Provider: ${this.name} (Message ID: ${mockId})`);
      if (options.text) {
        const preview = options.text.trim().split("\n").slice(0, 4).join("\n   ");
        console.log(`   Snippet:\n   ${preview}...`);
      }
      console.log("────────────────────────────────────────────────────────\n");
    }

    return {
      success: true,
      provider: this.name,
      providerMessageId: mockId,
      previewUrl: `http://localhost:3000/api/dev/email-preview/${mockId}`,
    };
  }

  getSentEmails(): RecordedEmail[] {
    return [...this.sentEmails];
  }

  getLastSentEmail(): RecordedEmail | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  clear(): void {
    this.sentEmails = [];
    this.shouldFail = false;
  }
}
