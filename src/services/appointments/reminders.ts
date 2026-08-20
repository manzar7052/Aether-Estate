import { createServiceRoleClient } from "@/lib/supabase/admin";
import type {
  AppointmentReminder,
  ReminderType,
  ReminderStatus,
} from "@/types/database";
import { emitNotificationEvent } from "@/services/notifications";

// ─── Constants & Configuration ───────────────────────────────────────────────

export interface ReminderOffsetConfig {
  type: ReminderType;
  offsetLabel: "24h" | "1h";
  minutesBefore: number;
}

export const REMINDER_OFFSETS: readonly ReminderOffsetConfig[] = [
  { type: "reminder_24h", offsetLabel: "24h", minutesBefore: 24 * 60 }, // 1440 minutes
  { type: "reminder_1h", offsetLabel: "1h", minutesBefore: 60 }, // 60 minutes
] as const;

export const MAX_REMINDER_ATTEMPTS = 3;
export const DEFAULT_REMINDER_BATCH_SIZE = 50;

export interface ReminderProcessingResult {
  totalDue: number;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  revertedForRetry: number;
}

// ─── Schedule Creation & Lifecycle Mutations ─────────────────────────────────

/**
 * Creates initial persistent reminder records for a newly booked appointment.
 */
export async function createAppointmentReminders(
  appointmentId: string,
  scheduledAtIso: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const scheduledTime = new Date(scheduledAtIso).getTime();
  const now = Date.now();

  for (const config of REMINDER_OFFSETS) {
    const scheduledForTime = scheduledTime - config.minutesBefore * 60 * 1000;
    const scheduledFor = new Date(scheduledForTime).toISOString();
    const isPast = scheduledForTime <= now;

    const payload = {
      appointment_id: appointmentId,
      reminder_type: config.type,
      scheduled_for: scheduledFor,
      status: (isPast ? "skipped" : "pending") as ReminderStatus,
      attempts: 0,
      last_error: isPast ? "Appointment booked within reminder window" : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("appointment_reminders")
      .upsert(payload, { onConflict: "appointment_id,reminder_type" });

    if (error) {
      console.error(
        `[createAppointmentReminders] Upsert failed for appt ${appointmentId} (${config.type}):`,
        error.message,
      );
    }
  }
}

/**
 * Recalculates reminder schedules when an appointment is rescheduled.
 */
export async function recalculateAppointmentReminders(
  appointmentId: string,
  newScheduledAtIso: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const newScheduledTime = new Date(newScheduledAtIso).getTime();
  const now = Date.now();

  for (const config of REMINDER_OFFSETS) {
    const scheduledForTime = newScheduledTime - config.minutesBefore * 60 * 1000;
    const scheduledFor = new Date(scheduledForTime).toISOString();
    const isPast = scheduledForTime <= now;

    const payload = {
      appointment_id: appointmentId,
      reminder_type: config.type,
      scheduled_for: scheduledFor,
      status: (isPast ? "skipped" : "pending") as ReminderStatus,
      attempts: 0,
      processed_at: null,
      last_error: isPast ? "Rescheduled within reminder window" : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("appointment_reminders")
      .upsert(payload, { onConflict: "appointment_id,reminder_type" });

    if (error) {
      console.error(
        `[recalculateAppointmentReminders] Upsert failed for appt ${appointmentId} (${config.type}):`,
        error.message,
      );
    }
  }
}

/**
 * Marks pending reminders as skipped when an appointment is cancelled or concluded.
 */
export async function skipAppointmentReminders(
  appointmentId: string,
  reason: string,
): Promise<void> {
  const admin = createServiceRoleClient();

  const { error } = await admin
    .from("appointment_reminders")
    .update({
      status: "skipped",
      last_error: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("appointment_id", appointmentId)
    .in("status", ["pending", "processing"]);

  if (error) {
    console.error(
      `[skipAppointmentReminders] Update failed for appt ${appointmentId}:`,
      error.message,
    );
  }
}

// ─── Reminder Processor Engine ───────────────────────────────────────────────

/**
 * Finds and processes due appointment reminders with concurrency-safe atomic claiming,
 * dynamic live appointment state verification, and bounded retry policy.
 */
export async function processDueAppointmentReminders(options?: {
  batchSize?: number;
}): Promise<ReminderProcessingResult> {
  const admin = createServiceRoleClient();
  const batchSize = options?.batchSize || DEFAULT_REMINDER_BATCH_SIZE;
  const nowIso = new Date().toISOString();

  const result: ReminderProcessingResult = {
    totalDue: 0,
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    revertedForRetry: 0,
  };

  // 1. Query candidate due reminders (indexed on status, scheduled_for)
  const { data: dueReminders, error: fetchErr } = await admin
    .from("appointment_reminders")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(batchSize);

  if (fetchErr || !dueReminders) {
    console.error("[processDueAppointmentReminders] Query failed:", fetchErr?.message);
    return result;
  }

  result.totalDue = dueReminders.length;

  // 2. Process each due reminder safely
  for (const reminder of dueReminders as AppointmentReminder[]) {
    // Step A: Atomic Concurrency Claim
    // Guarantees only ONE worker/cron process claims and dispatches this reminder
    const claimTime = new Date().toISOString();
    const { data: claimed, error: claimErr } = await admin
      .from("appointment_reminders")
      .update({
        status: "processing",
        updated_at: claimTime,
      })
      .eq("id", reminder.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (claimErr || !claimed) {
      // Concurrency race: Another scheduler instance claimed this record
      continue;
    }

    result.processed++;

    // Step B: Live Appointment State Verification
    const { data: appointment, error: apptErr } = await admin
      .from("appointments")
      .select("*")
      .eq("id", reminder.appointment_id)
      .maybeSingle();

    if (apptErr || !appointment) {
      // Appointment was deleted or not found
      await admin
        .from("appointment_reminders")
        .update({
          status: "skipped",
          last_error: "Parent appointment no longer exists.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", reminder.id);
      result.skipped++;
      continue;
    }

    // Step C: Status Eligibility Check (only scheduled/confirmed appointments receive reminders)
    if (appointment.status !== "scheduled" && appointment.status !== "confirmed") {
      await admin
        .from("appointment_reminders")
        .update({
          status: "skipped",
          last_error: `Appointment is in non-active status: ${appointment.status}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reminder.id);
      result.skipped++;
      continue;
    }

    // Step D: Stale Timing Discrepancy Verification (Reschedule Drift Protection)
    const offsetConfig = REMINDER_OFFSETS.find((o) => o.type === reminder.reminder_type);
    const expectedScheduledForTime =
      new Date(appointment.scheduled_at).getTime() -
      (offsetConfig?.minutesBefore || 0) * 60 * 1000;
    const reminderScheduledForTime = new Date(reminder.scheduled_for).getTime();
    const timeDiffMs = Math.abs(expectedScheduledForTime - reminderScheduledForTime);

    // If drift is > 5 minutes, this reminder record belongs to an old time slot before reschedule
    if (timeDiffMs > 5 * 60 * 1000) {
      if (expectedScheduledForTime > Date.now()) {
        // Reschedule into future slot
        await admin
          .from("appointment_reminders")
          .update({
            status: "pending",
            scheduled_for: new Date(expectedScheduledForTime).toISOString(),
            last_error: "Rescheduled timing updated automatically",
            updated_at: new Date().toISOString(),
          })
          .eq("id", reminder.id);
      } else {
        await admin
          .from("appointment_reminders")
          .update({
            status: "skipped",
            last_error: "Stale reminder slot past due after reschedule",
            updated_at: new Date().toISOString(),
          })
          .eq("id", reminder.id);
        result.skipped++;
      }
      continue;
    }

    // Step E: Dispatch Reminder via Phase 6A Email Notification Engine
    const attempts = (reminder.attempts || 0) + 1;
    const eventName: "appointment.reminder_24h" | "appointment.reminder_1h" =
      reminder.reminder_type === "reminder_1h"
        ? "appointment.reminder_1h"
        : "appointment.reminder_24h";

    const outcome = await emitNotificationEvent({
      event: eventName,
      appointmentId: appointment.id,
      leadId: appointment.lead_id,
      agentId: appointment.agent_id,
      version: `rem_${reminder.id}_att_${attempts}`,
    });

    const completionTime = new Date().toISOString();

    // Step F: Evaluate Result & Apply Bounded Retry Policy
    if (
      outcome.customerEmailSent ||
      outcome.agentEmailSent ||
      (outcome.customerSkippedReason && !outcome.error)
    ) {
      // Success: mark sent
      await admin
        .from("appointment_reminders")
        .update({
          status: "sent",
          attempts,
          processed_at: completionTime,
          last_error: outcome.error || null,
          updated_at: completionTime,
        })
        .eq("id", reminder.id);
      result.sent++;
    } else {
      // Provider failed: apply retry limit
      const isFinalAttempt = attempts >= MAX_REMINDER_ATTEMPTS;
      const finalStatus: ReminderStatus = isFinalAttempt ? "failed" : "pending";

      await admin
        .from("appointment_reminders")
        .update({
          status: finalStatus,
          attempts,
          last_error: outcome.error || "Email delivery failed",
          updated_at: completionTime,
        })
        .eq("id", reminder.id);

      if (isFinalAttempt) {
        result.failed++;
      } else {
        result.revertedForRetry++;
      }
    }
  }

  return result;
}
