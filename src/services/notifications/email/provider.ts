import type { SendEmailOptions, EmailSendResult } from "./types";

/**
 * Interface that all email providers must implement.
 */
export interface EmailProvider {
  readonly name: string;
  send(options: SendEmailOptions): Promise<EmailSendResult>;
}

// Module-level override (for testing and mocking)
let customEmailProvider: EmailProvider | null = null;

export function setEmailProvider(provider: EmailProvider | null): void {
  customEmailProvider = provider;
}

export function getCustomEmailProvider(): EmailProvider | null {
  return customEmailProvider;
}
