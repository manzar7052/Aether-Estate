/**
 * Server-Side Phone Normalization and Validation — Phase 6C
 * Ensures all phone numbers conform strictly to standard E.164 format (+[country_code][national_number]).
 */

export interface PhoneValidationResult {
  valid: boolean;
  normalized?: string; // E.164 formatted string, e.g. "+15125550199"
  reason?: "MISSING_PHONE" | "INVALID_PHONE" | "TOO_SHORT" | "TOO_LONG";
}

/**
 * Normalizes a raw user/profile input into canonical E.164 format.
 * Defaults to +1 (US/Canada) if a 10-digit number without country code is supplied.
 */
export function normalizePhoneNumber(
  rawPhone: string | null | undefined,
  defaultCountryCode = "+1",
): PhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== "string" || !rawPhone.trim()) {
    return { valid: false, reason: "MISSING_PHONE" };
  }

  const trimmed = rawPhone.trim();

  // Remove non-digit and non-plus characters (spaces, hyphens, dots, parentheses)
  const cleaned = trimmed.replace(/[^\d+]/g, "");

  if (!cleaned) {
    return { valid: false, reason: "INVALID_PHONE" };
  }

  // Handle number starting with +
  if (cleaned.startsWith("+")) {
    const digitsOnly = cleaned.slice(1);
    if (!/^\d+$/.test(digitsOnly)) {
      return { valid: false, reason: "INVALID_PHONE" };
    }
    if (digitsOnly.length < 10) {
      return { valid: false, reason: "TOO_SHORT" };
    }
    if (digitsOnly.length > 15) {
      return { valid: false, reason: "TOO_LONG" };
    }
    return { valid: true, normalized: cleaned };
  }

  // Handle number without leading +
  // Check if 10-digit standard US/Canada number
  if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
    const countryPrefix = defaultCountryCode.startsWith("+")
      ? defaultCountryCode
      : `+${defaultCountryCode}`;
    return { valid: true, normalized: `${countryPrefix}${cleaned}` };
  }

  // Check if 11-digit US number starting with 1
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return { valid: true, normalized: `+${cleaned}` };
  }

  // Check international format (11-15 digits)
  if (cleaned.length >= 10 && cleaned.length <= 15 && /^\d+$/.test(cleaned)) {
    return { valid: true, normalized: `+${cleaned}` };
  }

  return { valid: false, reason: "INVALID_PHONE" };
}

/**
 * Validates whether a phone number is a valid E.164 formatted string.
 */
export function isValidE164(phone: string): boolean {
  // Standard E.164: + followed by 10 to 15 digits, starting with 1-9
  return /^\+[1-9]\d{9,14}$/.test(phone);
}

/**
 * Masks a phone number for safe observability logs (e.g. +1512***1234).
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "[NO_PHONE]";
  const trimmed = phone.trim();
  if (trimmed.length <= 6) return "***";
  const start = trimmed.slice(0, 5);
  const end = trimmed.slice(-4);
  return `${start}****${end}`;
}
