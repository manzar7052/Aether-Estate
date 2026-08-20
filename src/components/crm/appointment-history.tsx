"use client";

import { useState, useEffect } from "react";
import type { Appointment } from "@/types/database";
import { APPOINTMENT_TYPES, APPOINTMENT_STATUSES } from "@/services/appointments/types";

interface AppointmentHistoryProps {
  leadId: string;
  refreshKey?: number;
}

export function AppointmentHistory({
  leadId,
  refreshKey = 0,
}: AppointmentHistoryProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/appointments?leadId=${leadId}`);
        const data = await res.json();

        if (!active) return;
        if (!res.ok) {
          throw new Error(data.error || "Failed to load appointments.");
        }

        setAppointments(data.appointments || []);
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load appointments.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [leadId, refreshKey]);

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800",
    confirmed: "bg-emerald-100 text-emerald-800",
    completed: "bg-brand-sand text-brand-ink",
    cancelled: "bg-slate-100 text-slate-600",
    no_show: "bg-rose-100 text-rose-800",
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-brand-slate py-3">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-gold border-t-transparent inline-block" />
        Loading appointment history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800">
        {error}
      </div>
    );
  }

  if (appointments.length === 0) {
    return null; // Don't show empty section
  }

  return (
    <div className="rounded-2xl border border-brand-line bg-white p-5 space-y-3 shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-brand-line/60 pb-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-sand text-brand-ink">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h4 className="font-serif font-bold text-sm text-brand-ink">
          Appointment History
        </h4>
        <span className="ml-auto rounded-full bg-brand-sand px-2 py-0.5 text-[10px] font-semibold text-brand-ink">
          {appointments.length}
        </span>
      </div>

      <div className="space-y-2">
        {appointments.map((appt) => (
          <div
            key={appt.id}
            className="flex items-center justify-between rounded-xl border border-brand-line/60 bg-brand-cream/20 p-3 text-xs"
          >
            <div className="space-y-0.5">
              <p className="font-semibold text-brand-ink">
                {new Date(appt.scheduled_at).toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Chicago",
                })}
              </p>
              <p className="text-brand-slate">
                {APPOINTMENT_TYPES.find((t) => t.type === appt.type)?.label || appt.type}
                {" · "}
                {appt.duration_minutes} min
              </p>
            </div>

            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                statusColors[appt.status] || "bg-slate-100 text-slate-700"
              }`}
            >
              {APPOINTMENT_STATUSES.find((s) => s.status === appt.status)?.label || appt.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
