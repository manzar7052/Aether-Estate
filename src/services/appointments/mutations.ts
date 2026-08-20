import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireApiStaff } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";
import type { AppointmentStatus } from "@/types/database";
import {
  ALLOWED_STATUS_TRANSITIONS,
  VALID_APPOINTMENT_STATUSES,
  RESCHEDULE_ALLOWED_STATUSES,
  CANCEL_ALLOWED_STATUSES,
  APPLICATION_TIMEZONE,
  WORKING_HOURS,
  WORKING_DAYS,
  DEFAULT_DURATION,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  type AppointmentWithDetails,
  type RescheduleAppointmentInput,
  type CancelAppointmentInput,
} from "./types";
import { getAppointmentDetailById } from "./queries";
import { emitNotificationEvent } from "@/services/notifications";
import {
  recalculateAppointmentReminders,
  skipAppointmentReminders,
} from "./reminders";

/**
 * Updates an appointment's operational status.
 *
 * Enforces:
 * 1. Staff authentication.
 * 2. Multi-agent ownership scoping (Agents can only update their own appointments).
 * 3. Status allowlist validation.
 * 4. Forward status transition rules (scheduled -> confirmed -> completed/no_show/cancelled).
 * 5. Prevents transferring ownership (agent_id remains immutable).
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: AppointmentStatus,
): Promise<AppointmentWithDetails> {
  // 1. Authenticate caller
  const { profile } = await requireApiStaff();

  if (!appointmentId) {
    throw new AppError("INVALID_ID", "Appointment ID is required.", 400);
  }

  if (!VALID_APPOINTMENT_STATUSES.has(newStatus)) {
    throw new AppError(
      "INVALID_STATUS",
      `'${newStatus}' is not a valid appointment status.`,
      400,
    );
  }

  const supabase = await createServerSupabaseClient();
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceRoleClient()
    : supabase;

  // 2. Fetch existing appointment and check ownership
  let { data: existingAppt, error: apptErr } = await supabase
    .from("appointments")
    .select("id, agent_id, status")
    .eq("id", appointmentId)
    .maybeSingle();

  if ((apptErr || !existingAppt) && admin) {
    const fb = await admin
      .from("appointments")
      .select("id, agent_id, status")
      .eq("id", appointmentId)
      .maybeSingle();
    existingAppt = fb.data;
    apptErr = fb.error;
  }

  if (apptErr || !existingAppt) {
    throw new AppError("APPOINTMENT_NOT_FOUND", "Appointment not found.", 404);
  }

  // 3. Multi-Agent Scoping Boundary (Agent can only update their own)
  if (profile.role === "agent" && existingAppt.agent_id !== profile.id) {
    console.warn(
      `[Security] Agent ${profile.id} attempted to update appointment ${appointmentId} belonging to Agent ${existingAppt.agent_id}`,
    );
    throw new AppError("APPOINTMENT_NOT_FOUND", "Appointment not found.", 404);
  }

  // 4. Validate status transition
  const currentStatus = existingAppt.status as AppointmentStatus;
  const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];

  if (currentStatus !== newStatus && !allowedNextStatuses.includes(newStatus)) {
    throw new AppError(
      "INVALID_STATUS_TRANSITION",
      `Cannot transition appointment from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${
        allowedNextStatuses.length > 0
          ? allowedNextStatuses.join(", ")
          : "none (terminal status)"
      }.`,
      400,
    );
  }

  const updatedAt = new Date().toISOString();

  // 5. Update appointment in PostgreSQL
  let { data, error } = await supabase
    .from("appointments")
    .update({
      status: newStatus,
      updated_at: updatedAt,
    })
    .eq("id", appointmentId)
    .select("*")
    .maybeSingle();

  if ((error || !data) && admin) {
    const fallback = await admin
      .from("appointments")
      .update({
        status: newStatus,
        updated_at: updatedAt,
      })
      .eq("id", appointmentId)
      .select("*")
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    console.error(
      `[updateAppointmentStatus] Failed to update appointment ${appointmentId}:`,
      error?.message,
    );
    throw new AppError(
      "STATUS_UPDATE_FAILED",
      "Unable to update appointment status.",
      500,
    );
  }

  console.log(
    `[Appointment Status Update] Appt ${appointmentId} transitioned ${currentStatus} -> ${newStatus} by ${profile.role} (${profile.email})`,
  );

  // If appointment reached terminal status, skip remaining pending reminders
  if (
    newStatus === "completed" ||
    newStatus === "cancelled" ||
    newStatus === "no_show"
  ) {
    try {
      await skipAppointmentReminders(
        appointmentId,
        `Appointment status changed to ${newStatus}`,
      );
    } catch (remErr) {
      console.error(
        "[updateAppointmentStatus] Reminder skip error (non-fatal):",
        remErr,
      );
    }
  }

  // 6. Return fully enriched appointment details
  return getAppointmentDetailById(appointmentId);
}

/**
 * Reschedules an active appointment to a new date and time.
 *
 * Enforces:
 * 1. Identity preservation: ID, lead_id, agent_id, created_at, type, duration are immutable.
 * 2. Multi-agent ownership authorization.
 * 3. Status eligibility: Only 'scheduled' and 'confirmed' appointments can be rescheduled.
 * 4. Timezone & working hours validation (09:00 - 17:00 CT, Mon - Fri).
 * 5. Interval conflict check EXCLUDING the appointment itself.
 * 6. PostgreSQL exclusion constraint race condition protection (23P01 -> 409 Conflict).
 */
export async function rescheduleAppointment(
  appointmentId: string,
  rawInput: RescheduleAppointmentInput,
): Promise<AppointmentWithDetails> {
  // 1. Authenticate caller
  const { profile } = await requireApiStaff();

  if (!appointmentId) {
    throw new AppError("INVALID_ID", "Appointment ID is required.", 400);
  }

  const parsed = rescheduleAppointmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message || "Invalid scheduled time.",
      400,
    );
  }

  const input = parsed.data;
  const admin = createServiceRoleClient();
  const supabase = await createServerSupabaseClient();

  // 2. Fetch existing appointment and verify ownership
  const { data: existingAppt, error: apptErr } = await admin
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();

  if (apptErr || !existingAppt) {
    throw new AppError("APPOINTMENT_NOT_FOUND", "Appointment not found.", 404);
  }

  // Multi-agent authorization scoping
  if (profile.role === "agent" && existingAppt.agent_id !== profile.id) {
    console.warn(
      `[Security] Agent ${profile.id} attempted to reschedule appointment ${appointmentId} belonging to Agent ${existingAppt.agent_id}`,
    );
    throw new AppError("APPOINTMENT_NOT_FOUND", "Appointment not found.", 404);
  }

  // 3. Status validation: only active appointments can be rescheduled
  const currentStatus = existingAppt.status as AppointmentStatus;
  if (!RESCHEDULE_ALLOWED_STATUSES.has(currentStatus)) {
    throw new AppError(
      "INVALID_STATUS",
      `Cannot reschedule an appointment in '${currentStatus}' status. Only active appointments can be rescheduled.`,
      400,
    );
  }

  // 4. Validate target scheduled time
  const scheduledAt = new Date(input.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    throw new AppError(
      "INVALID_DATETIME",
      "scheduledAt must be a valid ISO 8601 date string.",
      400,
    );
  }

  if (scheduledAt.getTime() <= Date.now()) {
    throw new AppError(
      "PAST_DATETIME",
      "Cannot reschedule an appointment to a past time.",
      400,
    );
  }

  // Validate working day & working hours in Central Time
  const centralParts = new Intl.DateTimeFormat("en-US", {
    timeZone: APPLICATION_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(scheduledAt);

  const getPart = (type: string) => {
    const p = centralParts.find((pt) => pt.type === type);
    return p ? parseInt(p.value, 10) : 0;
  };

  const centralHour = getPart("hour");
  const centralMin = getPart("minute");
  const centralYear = getPart("year");
  const centralMonth = getPart("month");
  const centralDay = getPart("day");

  // Check working day
  const targetDateObj = new Date(
    Date.UTC(centralYear, centralMonth - 1, centralDay, 12, 0, 0),
  );
  const jsDay = targetDateObj.getUTCDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;

  if (!WORKING_DAYS.includes(isoDay as (typeof WORKING_DAYS)[number])) {
    throw new AppError(
      "NON_WORKING_DAY",
      "Appointments can only be scheduled Monday through Friday.",
      400,
    );
  }

  // Check working hours
  const duration = existingAppt.duration_minutes || DEFAULT_DURATION;
  const startMinutes = centralHour * 60 + centralMin;
  const endMinutes = startMinutes + duration;
  const workingStartMin = WORKING_HOURS.start * 60;
  const workingEndMin = WORKING_HOURS.end * 60;

  if (startMinutes < workingStartMin || endMinutes > workingEndMin) {
    throw new AppError(
      "OUTSIDE_WORKING_HOURS",
      `Appointments must fall between ${WORKING_HOURS.start}:00 AM and ${WORKING_HOURS.end - 12}:00 PM Central Time.`,
      400,
    );
  }

  const appointmentEnd = new Date(scheduledAt.getTime() + duration * 60 * 1000);

  // 5. Check conflict excluding the appointment itself
  const { data: conflicts } = await admin
    .from("appointments")
    .select("id, scheduled_at, duration_minutes")
    .eq("agent_id", existingAppt.agent_id)
    .neq("id", appointmentId)
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
          "This time slot conflicts with an existing appointment. Please choose another available time.",
          409,
        );
      }
    }
  }

  // 6. Execute atomic update in PostgreSQL
  const updatedAt = new Date().toISOString();
  let { data: updatedAppt, error: updateErr } = await supabase
    .from("appointments")
    .update({
      scheduled_at: scheduledAt.toISOString(),
      updated_at: updatedAt,
    })
    .eq("id", appointmentId)
    .select("*")
    .single();

  if ((updateErr || !updatedAppt) && admin) {
    const fallback = await admin
      .from("appointments")
      .update({
        scheduled_at: scheduledAt.toISOString(),
        updated_at: updatedAt,
      })
      .eq("id", appointmentId)
      .select("*")
      .single();
    updatedAppt = fallback.data;
    updateErr = fallback.error;
  }

  if (updateErr) {
    // Check for exclusion constraint violation (concurrent race condition)
    if (
      updateErr.code === "23P01" ||
      updateErr.message?.includes("exclusion") ||
      updateErr.message?.includes("conflicting")
    ) {
      throw new AppError(
        "SLOT_CONFLICT",
        "That time is no longer available. Please choose another slot.",
        409,
      );
    }

    console.error(`[rescheduleAppointment] Failed:`, updateErr.message);
    throw new AppError(
      "RESCHEDULE_FAILED",
      "Unable to update the appointment. Please try again.",
      500,
    );
  }

  console.log(
    `[Appointment Rescheduled] Appt ${appointmentId} moved from ${existingAppt.scheduled_at} to ${scheduledAt.toISOString()}`,
  );

  // 7. Emit domain event for transactional email notification (side effect)
  try {
    await emitNotificationEvent({
      event: "appointment.rescheduled",
      appointmentId,
      leadId: existingAppt.lead_id,
      agentId: existingAppt.agent_id,
      previousScheduledAt: existingAppt.scheduled_at,
    });
  } catch (notifErr) {
    console.error(
      "[rescheduleAppointment] Notification emission error (non-fatal):",
      notifErr,
    );
  }

  // 8. Recalculate persistent reminder schedule (24h, 1h)
  try {
    await recalculateAppointmentReminders(
      appointmentId,
      scheduledAt.toISOString(),
    );
  } catch (remErr) {
    console.error(
      "[rescheduleAppointment] Reminder recalculation error (non-fatal):",
      remErr,
    );
  }

  return getAppointmentDetailById(appointmentId);
}

/**
 * Cancels an active appointment.
 *
 * Enforces:
 * 1. Soft cancellation (status = 'cancelled'); never deletes the row.
 * 2. Preserves historical record, lead_id, agent_id, original timing, notes.
 * 3. Status eligibility: Only 'scheduled' and 'confirmed' appointments can be cancelled.
 * 4. Releases the time slot so it becomes available for new bookings.
 */
export async function cancelAppointment(
  appointmentId: string,
  input?: CancelAppointmentInput,
): Promise<AppointmentWithDetails> {
  // 1. Authenticate caller
  const { profile } = await requireApiStaff();

  if (!appointmentId) {
    throw new AppError("INVALID_ID", "Appointment ID is required.", 400);
  }

  const parsed = cancelAppointmentSchema.safeParse(input || {});
  const reason = parsed.success ? parsed.data.reason : undefined;

  const admin = createServiceRoleClient();
  const supabase = await createServerSupabaseClient();

  // 2. Fetch existing appointment and verify ownership
  const { data: existingAppt, error: apptErr } = await admin
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();

  if (apptErr || !existingAppt) {
    throw new AppError("APPOINTMENT_NOT_FOUND", "Appointment not found.", 404);
  }

  // Multi-agent authorization scoping
  if (profile.role === "agent" && existingAppt.agent_id !== profile.id) {
    console.warn(
      `[Security] Agent ${profile.id} attempted to cancel appointment ${appointmentId} belonging to Agent ${existingAppt.agent_id}`,
    );
    throw new AppError("APPOINTMENT_NOT_FOUND", "Appointment not found.", 404);
  }

  // 3. Status validation: only active appointments can be cancelled
  const currentStatus = existingAppt.status as AppointmentStatus;
  if (currentStatus === "cancelled") {
    throw new AppError(
      "ALREADY_CANCELLED",
      "This appointment is already cancelled.",
      400,
    );
  }

  if (!CANCEL_ALLOWED_STATUSES.has(currentStatus)) {
    throw new AppError(
      "INVALID_STATUS",
      `Cannot cancel an appointment in '${currentStatus}' status. This appointment can no longer be changed.`,
      400,
    );
  }

  // 4. Update appointment to cancelled status
  const updatedAt = new Date().toISOString();
  const updatedNotes = reason
    ? existingAppt.notes
      ? `${existingAppt.notes}\n[Cancellation Reason]: ${reason}`
      : `[Cancellation Reason]: ${reason}`
    : existingAppt.notes;

  let { data: cancelledAppt, error: updateErr } = await supabase
    .from("appointments")
    .update({
      status: "cancelled" as const,
      notes: updatedNotes,
      updated_at: updatedAt,
    })
    .eq("id", appointmentId)
    .select("*")
    .single();

  if ((updateErr || !cancelledAppt) && admin) {
    const fallback = await admin
      .from("appointments")
      .update({
        status: "cancelled" as const,
        notes: updatedNotes,
        updated_at: updatedAt,
      })
      .eq("id", appointmentId)
      .select("*")
      .single();
    cancelledAppt = fallback.data;
    updateErr = fallback.error;
  }

  if (updateErr || !cancelledAppt) {
    console.error(`[cancelAppointment] Failed:`, updateErr?.message);
    throw new AppError(
      "CANCELLATION_FAILED",
      "Unable to cancel the appointment. Please try again.",
      500,
    );
  }

  console.log(
    `[Appointment Cancelled] Appt ${appointmentId} cancelled by ${profile.role} (${profile.email})`,
  );

  // 5. Emit domain event for transactional email notification (side effect)
  try {
    await emitNotificationEvent({
      event: "appointment.cancelled",
      appointmentId,
      leadId: existingAppt.lead_id,
      agentId: existingAppt.agent_id,
      reason,
    });
  } catch (notifErr) {
    console.error(
      "[cancelAppointment] Notification emission error (non-fatal):",
      notifErr,
    );
  }

  // 6. Mark pending reminders as skipped
  try {
    await skipAppointmentReminders(
      appointmentId,
      reason
        ? `Appointment cancelled: ${reason}`
        : "Appointment cancelled by staff",
    );
  } catch (remErr) {
    console.error(
      "[cancelAppointment] Reminder skip error (non-fatal):",
      remErr,
    );
  }

  return getAppointmentDetailById(appointmentId);
}
