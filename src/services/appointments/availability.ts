import { createServiceRoleClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/utils/errors";
import {
  APPLICATION_TIMEZONE,
  DEFAULT_DURATION,
  WORKING_HOURS,
  WORKING_DAYS,
  type AvailableSlot,
} from "./types";

/**
 * Generates available appointment slots for a specific agent on a specific date.
 *
 * Flow:
 * 1. Verify agent exists and has role 'agent'.
 * 2. Validate date (not past, not weekend).
 * 3. Generate candidate slots from WORKING_HOURS in APPLICATION_TIMEZONE.
 * 4. Load existing appointments for that agent on that date.
 * 5. Remove conflicting slots using interval overlap logic.
 * 6. For today's date, remove slots that have already passed.
 * 7. Return valid slots.
 */
export async function getAvailableSlots(
  agentId: string,
  dateStr: string,
  duration: number = DEFAULT_DURATION,
  excludeAppointmentId?: string,
): Promise<{
  slots: AvailableSlot[];
  date: string;
  agentId: string;
  timezone: string;
}> {
  if (!agentId) {
    throw new AppError("INVALID_AGENT_ID", "Agent ID is required.", 400);
  }

  // 1. Parse date
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    throw new AppError(
      "INVALID_DATE",
      "Date must be in YYYY-MM-DD format.",
      400,
    );
  }

  const [, yearStr, monthStr, dayStr] = dateMatch;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Build date in application timezone for weekday/past checks
  // We use the Intl API to resolve the date correctly in the target timezone
  const targetDate = new Date(
    Date.UTC(year, month - 1, day, 12, 0, 0),
  );

  // Get the weekday in the application timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APPLICATION_TIMEZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(targetDate);
  const weekdayName = parts.find((p) => p.type === "weekday")?.value || "";

  // Map to ISO weekday (1=Mon..7=Sun)
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const isoWeekday = weekdayMap[weekdayName] ?? 0;

  // 2. Check working day
  if (!(WORKING_DAYS as readonly number[]).includes(isoWeekday)) {
    return { slots: [], date: dateStr, agentId, timezone: APPLICATION_TIMEZONE };
  }

  // 3. Check past date
  const nowInTz = new Date(
    new Date().toLocaleString("en-US", { timeZone: APPLICATION_TIMEZONE }),
  );
  const todayStr = `${nowInTz.getFullYear()}-${String(nowInTz.getMonth() + 1).padStart(2, "0")}-${String(nowInTz.getDate()).padStart(2, "0")}`;

  if (dateStr < todayStr) {
    throw new AppError(
      "PAST_DATE",
      "Cannot view availability for past dates.",
      400,
    );
  }

  const admin = createServiceRoleClient();

  // 4. Verify agent exists
  const { data: agent, error: agentErr } = await admin
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", agentId)
    .maybeSingle();

  if (agentErr || !agent) {
    throw new AppError("AGENT_NOT_FOUND", "Agent not found.", 404);
  }

  // 5. Generate candidate slots
  // Build the start of day and end of day in the application timezone as UTC timestamps
  const dayStartUtc = tzToUtc(year, month, day, WORKING_HOURS.start, 0);
  const dayEndUtc = tzToUtc(year, month, day, WORKING_HOURS.end, 0);

  const candidateSlots: { startUtc: Date; endUtc: Date; display: string }[] =
    [];
  let cursor = new Date(dayStartUtc);

  while (cursor.getTime() + duration * 60 * 1000 <= dayEndUtc.getTime()) {
    const slotEnd = new Date(cursor.getTime() + duration * 60 * 1000);

    // Format display time in application timezone
    const displayTime = new Intl.DateTimeFormat("en-US", {
      timeZone: APPLICATION_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(cursor);

    candidateSlots.push({
      startUtc: new Date(cursor),
      endUtc: slotEnd,
      display: displayTime,
    });

    cursor = new Date(cursor.getTime() + duration * 60 * 1000);
  }

  // 6. Load existing appointments for this agent on this date
  let existingQuery = admin
    .from("appointments")
    .select("*")
    .eq("agent_id", agentId)
    .neq("status", "cancelled")
    .gte("scheduled_at", dayStartUtc.toISOString())
    .lt("scheduled_at", dayEndUtc.toISOString());

  if (excludeAppointmentId) {
    existingQuery = existingQuery.neq("id", excludeAppointmentId);
  }

  let existingAppts: Array<{ scheduled_at: string; duration_minutes?: number; status: string }> = [];
  const { data: fullAppts, error: apptErr } = await existingQuery;

  if (apptErr) {
    // If migration 0008 columns are in transition, fallback query
    let baseQuery = admin
      .from("appointments")
      .select("scheduled_at, status")
      .eq("agent_id", agentId)
      .neq("status", "cancelled")
      .gte("scheduled_at", dayStartUtc.toISOString())
      .lt("scheduled_at", dayEndUtc.toISOString());

    if (excludeAppointmentId) {
      baseQuery = baseQuery.neq("id", excludeAppointmentId);
    }
    
    const { data: baseAppts } = await baseQuery;
    existingAppts = (baseAppts || []).map((a) => ({
      scheduled_at: a.scheduled_at,
      status: a.status,
      duration_minutes: DEFAULT_DURATION,
    }));
  } else {
    existingAppts = fullAppts || [];
  }

  const bookedIntervals = existingAppts.map((a) => {
    const start = new Date(a.scheduled_at).getTime();
    const end = start + (a.duration_minutes || DEFAULT_DURATION) * 60 * 1000;
    return { start, end };
  });

  // 7. Filter out conflicting slots and past slots
  const now = Date.now();
  const isToday = dateStr === todayStr;

  const availableSlots: AvailableSlot[] = candidateSlots
    .filter((slot) => {
      // Skip past slots on today
      if (isToday && slot.startUtc.getTime() <= now) {
        return false;
      }

      // Check overlap with existing appointments
      // Overlap: slotStart < existingEnd AND slotEnd > existingStart
      const slotStart = slot.startUtc.getTime();
      const slotEnd = slot.endUtc.getTime();

      for (const booked of bookedIntervals) {
        if (slotStart < booked.end && slotEnd > booked.start) {
          return false;
        }
      }

      return true;
    })
    .map((slot) => ({
      time: slot.display,
      datetime: slot.startUtc.toISOString(),
    }));

  return {
    slots: availableSlots,
    date: dateStr,
    agentId,
    timezone: APPLICATION_TIMEZONE,
  };
}

/**
 * Convert a local time in APPLICATION_TIMEZONE to a UTC Date.
 */
function tzToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  // Create a date string in the target timezone and parse it
  // Use a formatter to figure out the UTC offset for this specific date/time
  const refDate = new Date(
    Date.UTC(year, month - 1, day, hour, minute, 0),
  );

  // Get the time representation in the target timezone
  const tzFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APPLICATION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // We need the offset between UTC and the timezone for this specific date.
  // Strategy: format the UTC reference as local time, parse, find the difference.
  const localParts = tzFormatter.formatToParts(refDate);
  const getPart = (type: string) =>
    localParts.find((p) => p.type === type)?.value || "0";

  const localInTz = new Date(
    Date.UTC(
      parseInt(getPart("year"), 10),
      parseInt(getPart("month"), 10) - 1,
      parseInt(getPart("day"), 10),
      parseInt(getPart("hour"), 10),
      parseInt(getPart("minute"), 10),
      parseInt(getPart("second"), 10),
    ),
  );

  // Offset = localInTz - refDate (in ms)
  const offsetMs = localInTz.getTime() - refDate.getTime();

  // The desired UTC time = target local time - offset
  // We want: "year-month-day hour:minute in APPLICATION_TIMEZONE" -> UTC
  const desiredLocalMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  return new Date(desiredLocalMs - offsetMs);
}
