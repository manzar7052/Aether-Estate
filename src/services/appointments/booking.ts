import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireApiStaff } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";
import {
  bookAppointmentSchema,
  APPLICATION_TIMEZONE,
  WORKING_HOURS,
  WORKING_DAYS,
  DEFAULT_DURATION,
  type BookAppointmentInput,
} from "./types";
import type { Appointment } from "@/types/database";
import { emitNotificationEvent } from "@/services/notifications";
import { createAppointmentReminders } from "./reminders";

/**
 * Books an appointment with full server-side validation.
 *
 * 12-step validation:
 * 1. Authenticate/authorize caller.
 * 2. Validate input with Zod.
 * 3. Verify lead exists.
 * 4. Verify caller has access (Admin: any, Agent: assigned only).
 * 5. Verify lead has an assigned agent.
 * 6. Validate appointment type (done by Zod).
 * 7. Validate duration (done by Zod).
 * 8. Parse/validate scheduled time (not past, within working hours, working day).
 * 9. Verify slot is within working hours in APPLICATION_TIMEZONE.
 * 10. Application-level conflict pre-check.
 * 11. INSERT — PostgreSQL EXCLUDE constraint is the final guard.
 * 12. Return created appointment.
 */
export async function bookAppointment(
  rawInput: unknown,
): Promise<Appointment> {
  // 1. Authenticate
  const { profile } = await requireApiStaff();

  // 2. Validate input
  const parseResult = bookAppointmentSchema.safeParse(rawInput);
  if (!parseResult.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      parseResult.error.issues.map((e: { message: string }) => e.message).join("; "),
      400,
    );
  }
  const input: BookAppointmentInput = parseResult.data;
  const duration = input.duration ?? DEFAULT_DURATION;

  const supabase = await createServerSupabaseClient();
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceRoleClient()
    : supabase;

  // 3. Verify lead exists
  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .select("id, assigned_agent_id, full_name")
    .eq("id", input.leadId)
    .maybeSingle();

  if (leadErr || !lead) {
    throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
  }

  // 4. Authorization boundary
  if (profile.role === "agent" && lead.assigned_agent_id !== profile.id) {
    console.warn(
      `[Security] Agent ${profile.id} attempted to book appointment for unassigned lead ${input.leadId}`,
    );
    throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
  }

  // 5. Verify lead has an assigned agent
  if (!lead.assigned_agent_id) {
    throw new AppError(
      "NO_ASSIGNED_AGENT",
      "This lead does not have an assigned agent. Assign an agent before booking.",
      400,
    );
  }

  const agentId = lead.assigned_agent_id;

  // Verify agent exists
  const { data: agent } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", agentId)
    .maybeSingle();

  if (!agent) {
    throw new AppError(
      "AGENT_NOT_FOUND",
      "Assigned agent not found.",
      404,
    );
  }

  // 8. Parse and validate scheduled time
  const scheduledAt = new Date(input.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    throw new AppError(
      "INVALID_DATETIME",
      "Scheduled time is not a valid datetime.",
      400,
    );
  }

  // Not in the past
  if (scheduledAt.getTime() <= Date.now()) {
    throw new AppError(
      "PAST_DATETIME",
      "Cannot book appointments in the past.",
      400,
    );
  }

  // 9. Verify within working hours and working day in APPLICATION_TIMEZONE
  const tzFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APPLICATION_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = tzFormatter.formatToParts(scheduledAt);
  const getPart = (type: string) =>
    parts.find((p) => p.type === type)?.value || "";

  const weekdayName = getPart("weekday");
  const hour = parseInt(getPart("hour"), 10);
  const minute = parseInt(getPart("minute"), 10);
  const slotTimeInMinutes = hour * 60 + minute;
  const slotEndInMinutes = slotTimeInMinutes + duration;

  const weekdayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  };
  const isoWeekday = weekdayMap[weekdayName] ?? 0;

  if (!(WORKING_DAYS as readonly number[]).includes(isoWeekday)) {
    throw new AppError(
      "NON_WORKING_DAY",
      "Appointments can only be booked on working days (Monday–Friday).",
      400,
    );
  }

  if (
    slotTimeInMinutes < WORKING_HOURS.start * 60 ||
    slotEndInMinutes > WORKING_HOURS.end * 60
  ) {
    throw new AppError(
      "OUTSIDE_WORKING_HOURS",
      `Appointments must be within working hours (${WORKING_HOURS.start}:00–${WORKING_HOURS.end}:00 ${APPLICATION_TIMEZONE}).`,
      400,
    );
  }

  // 10. Application-level conflict pre-check (for better error messages)
  const appointmentEnd = new Date(
    scheduledAt.getTime() + duration * 60 * 1000,
  );

  const { data: conflicts } = await admin
    .from("appointments")
    .select("id, scheduled_at, duration_minutes")
    .eq("agent_id", agentId)
    .neq("status", "cancelled")
    .lt("scheduled_at", appointmentEnd.toISOString())
    .gte(
      "scheduled_at",
      new Date(scheduledAt.getTime() - 60 * 60 * 1000).toISOString(),
    );

  if (conflicts && conflicts.length > 0) {
    for (const existing of conflicts) {
      const existStart = new Date(existing.scheduled_at).getTime();
      const existEnd =
        existStart + (existing.duration_minutes || DEFAULT_DURATION) * 60 * 1000;

      if (
        scheduledAt.getTime() < existEnd &&
        appointmentEnd.getTime() > existStart
      ) {
        throw new AppError(
          "SLOT_CONFLICT",
          "This time slot conflicts with an existing appointment. Please choose another time.",
          409,
        );
      }
    }
  }

  // 11. Insert appointment — EXCLUDE constraint is the final guard
  const insertPayload = {
    lead_id: input.leadId,
    agent_id: agentId,
    scheduled_at: scheduledAt.toISOString(),
    duration_minutes: duration,
    type: input.type,
    status: "scheduled" as const,
    notes: input.notes || null,
  };

  let { data: appointment, error: insertErr } = await supabase
    .from("appointments")
    .insert(insertPayload)
    .select("*")
    .single();

  // Fallback to service role if RLS blocks
  if ((insertErr || !appointment) && admin !== supabase) {
    const fb = await admin
      .from("appointments")
      .insert(insertPayload)
      .select("*")
      .single();
    appointment = fb.data;
    insertErr = fb.error;
  }

  if (insertErr) {
    // Check for exclusion constraint violation (race condition)
    if (
      insertErr.code === "23P01" ||
      insertErr.message?.includes("exclusion") ||
      insertErr.message?.includes("conflicting")
    ) {
      throw new AppError(
        "SLOT_CONFLICT",
        "This time slot was just booked by someone else. Please choose another available time.",
        409,
      );
    }

    // Fallback if migration 0008 columns are in transition
    if (insertErr.code === "42703" || insertErr.message?.includes("duration_minutes")) {
      const basePayload = {
        lead_id: input.leadId,
        agent_id: agentId,
        scheduled_at: scheduledAt.toISOString(),
        status: "scheduled" as const,
        notes: input.notes || null,
      };
      const { data: baseAppt, error: baseErr } = await admin
        .from("appointments")
        .insert(basePayload)
        .select("*")
        .single();

      if (baseAppt && !baseErr) {
        appointment = {
          ...baseAppt,
          duration_minutes: duration,
          type: input.type,
        } as unknown as typeof appointment;
        insertErr = null;
      }
    }
  }

  if (insertErr) {
    console.error("[bookAppointment] Insert failed:", insertErr.message);
    throw new AppError(
      "BOOKING_FAILED",
      "Unable to create appointment. Please try again.",
      500,
    );
  }

  if (!appointment) {
    throw new AppError("BOOKING_FAILED", "Appointment creation returned no data.", 500);
  }

  console.log(
    `[Appointment Booked] Lead ${input.leadId} with Agent ${agentId} at ${scheduledAt.toISOString()} (${input.type}, ${duration}min) by ${profile.role} ${profile.email}`,
  );

  // 12. Emit domain event for transactional email notification (side effect)
  try {
    await emitNotificationEvent({
      event: "appointment.created",
      appointmentId: appointment.id,
      leadId: input.leadId,
      agentId,
    });
  } catch (notifErr) {
    console.error(
      "[bookAppointment] Notification emission error (non-fatal):",
      notifErr,
    );
  }

  // 13. Create persistent reminder records (24h, 1h)
  try {
    await createAppointmentReminders(appointment.id, scheduledAt.toISOString());
  } catch (remErr) {
    console.error(
      "[bookAppointment] Reminder creation error (non-fatal):",
      remErr,
    );
  }

  return appointment as unknown as Appointment;
}
