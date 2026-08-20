"use client";

import { useState, useCallback } from "react";
import type { Lead, Appointment, AppointmentType } from "@/types/database";
import { APPOINTMENT_TYPES } from "@/services/appointments/types";

interface AppointmentBookingPanelProps {
  lead: Lead;
  onAppointmentBooked?: (appointment: Appointment) => void;
}

interface AvailableSlot {
  time: string;
  datetime: string;
}

export function AppointmentBookingPanel({
  lead,
  onAppointmentBooked,
}: AppointmentBookingPanelProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [selectedType, setSelectedType] = useState<AppointmentType>("consultation");
  const [notes, setNotes] = useState("");
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);

  const agentId = lead.assigned_agent_id;

  // Compute today's date string for min attribute
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const fetchSlots = useCallback(async (date: string) => {
    if (!agentId || !date) return;
    setIsLoadingSlots(true);
    setError(null);
    setSelectedSlot(null);

    try {
      const res = await fetch(
        `/api/appointments/availability?agentId=${agentId}&date=${date}`,
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to load availability.");
      }

      setSlots(data.slots || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load availability.");
      setSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [agentId]);

  function handleDateChange(date: string) {
    setSelectedDate(date);
    if (date) {
      fetchSlots(date);
    } else {
      setSlots([]);
    }
  }

  async function handleBook() {
    if (!selectedSlot) return;
    setIsBooking(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          scheduledAt: selectedSlot.datetime,
          type: selectedType,
          duration: 30,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 409) {
          // Race condition — slot just booked
          setError("That time was just booked. Please choose another available slot.");
          fetchSlots(selectedDate);
          return;
        }
        throw new Error(data.error || "Booking failed.");
      }

      setBookedAppointment(data.appointment);
      setSuccessMsg("Appointment booked successfully!");
      setSelectedSlot(null);
      setNotes("");

      if (onAppointmentBooked) {
        onAppointmentBooked(data.appointment);
      }

      // Refresh slots
      fetchSlots(selectedDate);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setIsBooking(false);
    }
  }

  if (!agentId) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-line/80 bg-white/60 p-5 text-center">
        <p className="text-xs text-brand-slate">
          Assign an agent to this lead before booking appointments.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-line bg-gradient-to-b from-brand-sand/30 to-brand-cream/30 p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-brand-line/60 pb-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gold text-brand-ink shadow-sm">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <h4 className="font-serif font-bold text-sm text-brand-ink">
            Schedule Appointment
          </h4>
          <p className="text-[11px] text-brand-slate">
            Book a time with the assigned agent
          </p>
        </div>
      </div>

      {/* Confirmation Banner */}
      {bookedAppointment && successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-800">
              ✓ {successMsg}
            </span>
            <button
              type="button"
              onClick={() => {
                setBookedAppointment(null);
                setSuccessMsg(null);
              }}
              className="text-emerald-600 font-semibold underline text-[11px]"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-emerald-800">
            <div>
              <span className="text-emerald-600">Date & Time:</span>{" "}
              {new Date(bookedAppointment.scheduled_at).toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Chicago",
              })}
            </div>
            <div>
              <span className="text-emerald-600">Type:</span>{" "}
              {APPOINTMENT_TYPES.find((t) => t.type === bookedAppointment.type)?.label || bookedAppointment.type}
            </div>
            <div>
              <span className="text-emerald-600">Duration:</span>{" "}
              {bookedAppointment.duration_minutes} min
            </div>
            <div>
              <span className="text-emerald-600">Status:</span>{" "}
              <span className="font-bold capitalize">{bookedAppointment.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Date Picker */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-brand-slate">
          Select Date
        </label>
        <input
          type="date"
          min={minDate}
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5 text-sm text-brand-ink shadow-sm focus:border-brand-gold focus:outline-none"
        />
      </div>

      {/* Appointment Type */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-brand-slate">
          Appointment Type
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as AppointmentType)}
          className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5 text-sm text-brand-ink shadow-sm focus:border-brand-gold focus:outline-none capitalize"
        >
          {APPOINTMENT_TYPES.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Available Slots */}
      {selectedDate && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-brand-slate">
            Available Times{" "}
            <span className="font-normal text-brand-slate/70">
              (Central Time)
            </span>
          </label>

          {isLoadingSlots ? (
            <div className="flex items-center gap-2 text-xs text-brand-slate py-3">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-gold border-t-transparent inline-block" />
              Loading availability...
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-brand-line/80 bg-white/60 p-3 text-center text-xs text-brand-slate">
              No appointments are available for this date.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.datetime}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    selectedSlot?.datetime === slot.datetime
                      ? "border-brand-gold bg-brand-gold text-brand-ink shadow-sm"
                      : "border-brand-line bg-white text-brand-ink hover:border-brand-gold/60 hover:bg-brand-sand/30"
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes (optional) */}
      {selectedSlot && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-brand-slate">
            Notes <span className="font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Any special requirements or context..."
            className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-xs text-brand-ink shadow-sm resize-none focus:border-brand-gold focus:outline-none"
          />
        </div>
      )}

      {/* Book Button */}
      {selectedSlot && (
        <button
          type="button"
          disabled={isBooking}
          onClick={handleBook}
          className="w-full rounded-xl bg-brand-ink px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-black transition disabled:opacity-50"
        >
          {isBooking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-gold border-t-transparent inline-block" />
              Booking...
            </span>
          ) : (
            <>
              Book Appointment — {selectedSlot.time}
            </>
          )}
        </button>
      )}

      {/* Timezone Disclaimer */}
      <p className="text-[10px] text-brand-slate/70 flex items-center gap-1">
        <svg className="h-3 w-3 text-brand-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        All times are displayed in Central Time (America/Chicago). Availability is verified server-side at booking time.
      </p>
    </div>
  );
}
