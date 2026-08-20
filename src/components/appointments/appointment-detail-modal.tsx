"use client";

import { useState } from "react";
import Link from "next/link";
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  RESCHEDULE_ALLOWED_STATUSES,
  CANCEL_ALLOWED_STATUSES,
  type AppointmentWithDetails,
  type AvailableSlot,
} from "@/services/appointments/types";
import type { AppointmentStatus, Lead } from "@/types/database";
import { QualificationBadge } from "@/components/crm/qualification-badge";

interface AppointmentDetailModalProps {
  appointment: AppointmentWithDetails | null;
  onClose: () => void;
  onStatusUpdated?: (updated: AppointmentWithDetails) => void;
}

export function AppointmentDetailModal({
  appointment,
  onClose,
  onStatusUpdated,
}: AppointmentDetailModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Cancellation state
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  if (!appointment) return null;

  const lead = appointment.lead;
  const agent = appointment.agent;

  const statusColors: Record<AppointmentStatus, string> = {
    scheduled: "bg-blue-100 text-blue-800 border-blue-200",
    confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    completed: "bg-brand-sand text-brand-ink border-brand-line",
    cancelled: "bg-slate-100 text-slate-600 border-slate-200",
    no_show: "bg-rose-100 text-rose-800 border-rose-200",
  };

  const formattedDateTime = new Date(
    appointment.scheduled_at,
  ).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });

  const typeLabel =
    APPOINTMENT_TYPES.find((t) => t.type === appointment.type)?.label ||
    appointment.type;

  const statusLabel =
    APPOINTMENT_STATUSES.find((s) => s.status === appointment.status)?.label ||
    appointment.status;

  const minDate = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Chicago",
  });

  async function handleStatusTransition(newStatus: AppointmentStatus) {
    if (!appointment) return;
    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/appointments/${appointment.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to update status.");
      }

      if (onStatusUpdated && data.appointment) {
        onStatusUpdated(data.appointment);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update appointment status.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function fetchSlots(date: string) {
    if (!date || !appointment) return;
    setIsLoadingSlots(true);
    setSelectedSlot(null);
    setError(null);

    try {
      const params = new URLSearchParams({
        agentId: appointment.agent_id,
        date,
        duration: String(appointment.duration_minutes || 30),
        excludeAppointmentId: appointment.id,
      });

      const res = await fetch(`/api/appointments/availability?${params}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load available slots.");
      }

      setAvailableSlots(data.slots || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load available slots.",
      );
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }

  function handleDateChange(newDate: string) {
    setRescheduleDate(newDate);
    if (newDate) {
      fetchSlots(newDate);
    } else {
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }

  async function handleConfirmReschedule() {
    if (!appointment || !selectedSlot) return;
    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/appointments/${appointment.id}/reschedule`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledAt: selectedSlot.datetime }),
        },
      );

      const data = await res.json();

      if (res.status === 409) {
        // Stale slot conflict -> refresh availability
        setError(
          "That time is no longer available. Please choose another slot.",
        );
        fetchSlots(rescheduleDate);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to reschedule appointment.");
      }

      if (onStatusUpdated && data.appointment) {
        onStatusUpdated(data.appointment);
      }
      setIsRescheduling(false);
      setSelectedSlot(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update the appointment. Please try again.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleConfirmCancellation() {
    if (!appointment) return;
    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/appointments/${appointment.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to cancel appointment.");
      }

      if (onStatusUpdated && data.appointment) {
        onStatusUpdated(data.appointment);
      }
      setIsCancelling(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to cancel the appointment. Please try again.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  const isRescheduleEligible = RESCHEDULE_ALLOWED_STATUSES.has(
    appointment.status,
  );
  const isCancelEligible = CANCEL_ALLOWED_STATUSES.has(appointment.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brand-ink/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-brand-line bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-brand-line p-5 sm:p-6 bg-brand-cream/40">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-serif text-2xl font-bold text-brand-ink">
                Appointment Details
              </h3>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider border ${
                  statusColors[appointment.status]
                }`}
              >
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 text-xs text-brand-slate">
              Appointment ID: <span className="font-mono">{appointment.id}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-brand-slate hover:bg-brand-sand hover:text-brand-ink transition"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Timing & Type Ribbon */}
          <div className="rounded-2xl border border-brand-line bg-brand-sand/30 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-brand-slate font-medium block">
                Scheduled Time (Central)
              </span>
              <p className="font-bold text-brand-ink mt-0.5">
                {formattedDateTime}
              </p>
            </div>
            <div>
              <span className="text-brand-slate font-medium block">
                Appointment Type
              </span>
              <p className="font-bold text-brand-ink mt-0.5">{typeLabel}</p>
            </div>
            <div>
              <span className="text-brand-slate font-medium block">Duration</span>
              <p className="font-bold text-brand-ink mt-0.5">
                {appointment.duration_minutes} minutes
              </p>
            </div>
          </div>

          {/* Operational Status Transitions & Lifecycle Actions */}
          <div className="rounded-2xl border border-brand-line bg-white p-4 space-y-3">
            <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-brand-slate">
              Appointment Actions
            </h4>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {appointment.status === "scheduled" && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusTransition("confirmed")}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {isUpdating ? "Updating..." : "✓ Confirm Appointment"}
                </button>
              )}

              {appointment.status === "confirmed" && (
                <>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleStatusTransition("completed")}
                    className="rounded-xl bg-brand-ink px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black transition disabled:opacity-50"
                  >
                    {isUpdating ? "Updating..." : "Mark Completed"}
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleStatusTransition("no_show")}
                    className="rounded-xl bg-rose-50 text-rose-700 border border-rose-200 px-4 py-2 text-xs font-semibold hover:bg-rose-100 transition disabled:opacity-50"
                  >
                    {isUpdating ? "Updating..." : "Mark No Show"}
                  </button>
                </>
              )}

              {/* Reschedule Button */}
              {isRescheduleEligible && !isRescheduling && !isCancelling && (
                <button
                  type="button"
                  onClick={() => {
                    setIsRescheduling(true);
                    setIsCancelling(false);
                    setRescheduleDate(minDate);
                    fetchSlots(minDate);
                  }}
                  className="rounded-xl border border-brand-gold bg-brand-gold/10 px-4 py-2 text-xs font-semibold text-brand-ink hover:bg-brand-gold/20 transition"
                >
                  📅 Reschedule
                </button>
              )}

              {/* Cancel Button */}
              {isCancelEligible && !isCancelling && !isRescheduling && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCancelling(true);
                    setIsRescheduling(false);
                  }}
                  className="rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                >
                  Cancel Appointment
                </button>
              )}

              {(appointment.status === "completed" ||
                appointment.status === "no_show" ||
                appointment.status === "cancelled") && (
                <p className="text-xs text-brand-slate italic">
                  This appointment is in terminal status ({appointment.status}).
                </p>
              )}
            </div>

            {/* ─── RESCHEDULE WORKFLOW PANEL ────────────────────────────── */}
            {isRescheduling && (
              <div className="rounded-2xl border border-brand-gold/60 bg-brand-cream/30 p-4 space-y-4 pt-3 mt-3">
                <div className="flex items-center justify-between border-b border-brand-line/60 pb-2">
                  <h5 className="font-serif font-bold text-sm text-brand-ink">
                    Reschedule Appointment
                  </h5>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRescheduling(false);
                      setSelectedSlot(null);
                    }}
                    className="text-xs text-brand-slate hover:text-brand-ink"
                  >
                    Cancel
                  </button>
                </div>

                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1">
                    Select New Date (Central Time)
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    value={rescheduleDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-xs text-brand-ink shadow-sm focus:border-brand-gold focus:outline-none"
                  />
                </div>

                {/* Slot Selection */}
                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1.5">
                    Available Time Slots
                  </label>

                  {isLoadingSlots ? (
                    <div className="py-6 text-center text-xs text-brand-slate">
                      Loading available slots...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-brand-line p-3 text-center text-xs text-brand-slate">
                      No available slots on this date. Please select another working day.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                      {availableSlots.map((slot) => {
                        const isSelected =
                          selectedSlot?.datetime === slot.datetime;
                        return (
                          <button
                            key={slot.datetime}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`rounded-xl border px-3 py-2 text-xs font-medium transition text-center ${
                              isSelected
                                ? "border-brand-gold bg-brand-gold text-brand-ink font-bold shadow-sm"
                                : "border-brand-line bg-white text-brand-ink hover:border-brand-gold/60"
                            }`}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Confirmation Comparison Card */}
                {selectedSlot && (
                  <div className="rounded-xl border border-brand-line bg-white p-3 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-brand-slate font-medium block">
                          Current Time:
                        </span>
                        <p className="font-semibold text-brand-ink">
                          {new Date(appointment.scheduled_at).toLocaleTimeString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "America/Chicago",
                            },
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-brand-gold font-medium block">
                          New Target Time:
                        </span>
                        <p className="font-bold text-brand-ink">
                          {new Date(selectedSlot.datetime).toLocaleTimeString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "America/Chicago",
                            },
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={handleConfirmReschedule}
                      className="w-full rounded-xl bg-brand-gold py-2 text-xs font-bold text-brand-ink shadow-sm hover:bg-brand-gold/90 transition disabled:opacity-50 mt-2"
                    >
                      {isUpdating ? "Rescheduling..." : "Confirm Reschedule"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ─── CANCELLATION WORKFLOW PANEL ──────────────────────────── */}
            {isCancelling && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-3 pt-3 mt-3">
                <h5 className="font-serif font-bold text-sm text-rose-900">
                  Cancel this appointment?
                </h5>
                <p className="text-xs text-rose-800">
                  This will mark the appointment as cancelled and release the time slot for new bookings. The historical record will be preserved.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-brand-slate mb-1">
                    Reason for cancellation (optional):
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Prospect requested cancellation due to scheduling conflict"
                    className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-xs text-brand-ink shadow-sm focus:border-rose-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleConfirmCancellation}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition disabled:opacity-50"
                  >
                    {isUpdating ? "Cancelling..." : "Confirm Cancellation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCancelling(false)}
                    className="rounded-xl border border-brand-line bg-white px-4 py-2 text-xs font-semibold text-brand-ink hover:bg-brand-sand transition"
                  >
                    Keep Appointment
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Prospect Information Card */}
          {lead ? (
            <div className="rounded-2xl border border-brand-line bg-white p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-brand-line/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-serif font-bold text-sm text-brand-ink">
                    {lead.full_name}
                  </h4>
                  <QualificationBadge
                    lead={lead as unknown as Lead}
                    size="sm"
                  />
                </div>
                <Link
                  href={`/dashboard/leads?search=${encodeURIComponent(lead.email)}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-gold hover:underline"
                >
                  <span>View Lead in CRM</span>
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-brand-slate">Email:</span>{" "}
                  <a
                    href={`mailto:${lead.email}`}
                    className="font-medium text-brand-ink hover:underline"
                  >
                    {lead.email}
                  </a>
                </div>
                <div>
                  <span className="text-brand-slate">Phone:</span>{" "}
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      className="font-medium text-brand-ink hover:underline"
                    >
                      {lead.phone}
                    </a>
                  ) : (
                    <span className="italic text-brand-slate">Not provided</span>
                  )}
                </div>
                <div>
                  <span className="text-brand-slate">Lead Status:</span>{" "}
                  <span className="font-semibold capitalize text-brand-ink">
                    {lead.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <span className="text-brand-slate">Source:</span>{" "}
                  <span className="font-semibold capitalize text-brand-ink">
                    {lead.source}
                  </span>
                </div>
                {lead.city && (
                  <div>
                    <span className="text-brand-slate">Target City:</span>{" "}
                    <span className="font-medium text-brand-ink">{lead.city}</span>
                  </div>
                )}
                {lead.budget_max && (
                  <div>
                    <span className="text-brand-slate">Budget Max:</span>{" "}
                    <span className="font-medium text-brand-ink">
                      ${lead.budget_max.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-brand-line p-4 text-center text-xs text-brand-slate">
              Lead information unavailable.
            </div>
          )}

          {/* Assigned Agent Card */}
          {agent && (
            <div className="rounded-2xl border border-brand-line bg-white p-4 space-y-2">
              <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-brand-slate">
                Assigned Licensed Agent
              </h4>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-brand-ink">{agent.full_name}</p>
                  <p className="text-brand-slate">{agent.email}</p>
                </div>
                <span className="rounded-md bg-brand-sand px-2.5 py-0.5 text-xs font-semibold capitalize text-brand-ink">
                  {agent.role}
                </span>
              </div>
            </div>
          )}

          {/* Property Context */}
          {appointment.property && (
            <div className="rounded-2xl border border-brand-line bg-white p-4 space-y-1 text-xs">
              <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-brand-slate">
                Associated Property
              </h4>
              <p className="font-bold text-brand-ink text-sm">
                {appointment.property.title}
              </p>
              <p className="text-brand-slate">
                {appointment.property.city} · $
                {appointment.property.price.toLocaleString()}
              </p>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="rounded-2xl border border-brand-line bg-white p-4 space-y-1 text-xs">
              <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-brand-slate">
                Appointment Notes
              </h4>
              <p className="text-brand-ink italic bg-brand-sand/20 p-3 rounded-xl whitespace-pre-wrap">
                &ldquo;{appointment.notes}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-brand-line p-4 bg-brand-cream/20">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-brand-ink px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
