import { APPLICATION_TIMEZONE } from "@/services/appointments/types";

/**
 * Formats a UTC ISO timestamp into canonical Central Time string.
 * Example: "Wednesday, September 16, 2026 at 10:00 AM CT"
 */
export function formatAppointmentDateTime(
  isoDateStr: string,
  timezone: string = APPLICATION_TIMEZONE,
): string {
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) {
      return isoDateStr;
    }

    const dateFormatted = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);

    const timeFormatted = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);

    // Determine CT suffix (Central Time)
    return `${dateFormatted} at ${timeFormatted} CT`;
  } catch (err) {
    console.error("[formatAppointmentDateTime] Error formatting date:", err);
    return isoDateStr;
  }
}

/**
 * Escapes unsafe characters for HTML email rendering.
 * Prevents HTML injection from lead name, property title, or notes.
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
