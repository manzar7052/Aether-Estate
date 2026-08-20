"use client";

import type {
  AppointmentWithDetails,
  AppointmentViewMode,
} from "@/services/appointments/types";
import { APPOINTMENT_TYPES } from "@/services/appointments/types";
import type { AppointmentStatus } from "@/types/database";
import { QualificationBadge } from "@/components/crm/qualification-badge";

interface AppointmentCalendarProps {
  viewMode: AppointmentViewMode;
  currentDate: string; // YYYY-MM-DD
  appointments: AppointmentWithDetails[];
  isLoading: boolean;
  onSelectAppointment: (appointment: AppointmentWithDetails) => void;
}

export function AppointmentCalendar({
  viewMode,
  currentDate,
  appointments,
  isLoading,
  onSelectAppointment,
}: AppointmentCalendarProps) {
  const statusColors: Record<AppointmentStatus, string> = {
    scheduled: "bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100/80",
    confirmed:
      "bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100/80",
    completed: "bg-brand-sand/50 border-brand-line text-brand-ink hover:bg-brand-sand",
    cancelled: "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100",
    no_show: "bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100/80",
  };

  const statusBadgeColors: Record<AppointmentStatus, string> = {
    scheduled: "bg-blue-100 text-blue-800",
    confirmed: "bg-emerald-100 text-emerald-800",
    completed: "bg-brand-sand text-brand-ink",
    cancelled: "bg-slate-200 text-slate-600",
    no_show: "bg-rose-100 text-rose-800",
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-3xl border border-brand-line bg-white p-12">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-3 border-brand-gold border-t-transparent" />
          <p className="text-xs font-semibold text-brand-slate">
            Loading calendar appointments...
          </p>
        </div>
      </div>
    );
  }

  // ─── DAY VIEW ──────────────────────────────────────────────────────────────
  if (viewMode === "day") {
    // Filter appointments for this single date
    const dayAppointments = appointments.filter((a) => {
      const apptDateStr = new Date(a.scheduled_at).toLocaleDateString(
        "en-CA", // YYYY-MM-DD
        { timeZone: "America/Chicago" },
      );
      return apptDateStr === currentDate;
    });

    if (dayAppointments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-brand-line bg-white/60 p-16 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sand text-brand-ink">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h4 className="font-serif text-base font-bold text-brand-ink">
            No appointments scheduled for today
          </h4>
          <p className="text-xs text-brand-slate max-w-sm">
            There are no appointments on this date matching your active filters.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-brand-line bg-white p-5 sm:p-6 shadow-sm space-y-3">
        <h4 className="font-serif font-bold text-sm text-brand-ink border-b border-brand-line/60 pb-3 flex items-center justify-between">
          <span>
            {new Date(`${currentDate}T12:00:00Z`).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}
          </span>
          <span className="text-xs font-normal text-brand-slate">
            {dayAppointments.length} appointment
            {dayAppointments.length === 1 ? "" : "s"}
          </span>
        </h4>

        <div className="space-y-3">
          {dayAppointments.map((appt) => {
            const timeStr = new Date(appt.scheduled_at).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: "America/Chicago",
              },
            );

            const typeLabel =
              APPOINTMENT_TYPES.find((t) => t.type === appt.type)?.label ||
              appt.type;

            return (
              <div
                key={appt.id}
                onClick={() => onSelectAppointment(appt)}
                className={`cursor-pointer rounded-2xl border p-4 transition shadow-sm ${
                  statusColors[appt.status]
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-line/40 pb-2.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-brand-ink bg-white/80 px-2.5 py-1 rounded-lg border border-brand-line/60">
                      {timeStr}
                    </span>
                    <span className="text-xs font-semibold">{typeLabel}</span>
                    <span className="text-[11px] text-brand-slate">
                      ({appt.duration_minutes} min)
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider self-start sm:self-auto ${
                      statusBadgeColors[appt.status]
                    }`}
                  >
                    {appt.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-brand-ink">
                        {appt.lead?.full_name || "Unknown Prospect"}
                      </span>
                      {appt.lead && (
                        <QualificationBadge
                          lead={appt.lead as unknown as import("@/types/database").Lead}
                          size="sm"
                        />
                      )}
                    </div>
                    <p className="text-brand-slate text-[11px] mt-0.5">
                      {appt.lead?.email} {appt.lead?.phone && `· ${appt.lead.phone}`}
                    </p>
                  </div>

                  {appt.agent && (
                    <div className="text-right sm:text-right text-[11px] text-brand-slate">
                      <span className="font-medium text-brand-ink">
                        {appt.agent.full_name}
                      </span>
                      <p>{appt.agent.email}</p>
                    </div>
                  )}
                </div>

                {appt.notes && (
                  <p className="mt-2.5 text-[11px] text-brand-slate italic bg-white/60 p-2 rounded-lg border border-brand-line/40">
                    &ldquo;{appt.notes}&rdquo;
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── WEEK VIEW (Monday – Friday) ───────────────────────────────────────────
  // Calculate Monday date of the selected week
  const selectedDateObj = new Date(`${currentDate}T12:00:00Z`);
  const dayOfWeek = selectedDateObj.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const mondayDate = new Date(selectedDateObj);
  mondayDate.setUTCDate(selectedDateObj.getUTCDate() + diffToMonday);

  const weekdays = [0, 1, 2, 3, 4].map((offset) => {
    const d = new Date(mondayDate);
    d.setUTCDate(mondayDate.getUTCDate() + offset);
    const dateStr = d.toISOString().split("T")[0];
    const isToday =
      dateStr ===
      new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Chicago",
      });

    return {
      dateStr,
      dayName: d.toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC",
      }),
      dayNum: d.getUTCDate(),
      monthName: d.toLocaleDateString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
      isToday,
    };
  });

  return (
    <div className="rounded-3xl border border-brand-line bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-brand-line">
        {weekdays.map((day) => {
          // Find appointments for this specific weekday
          const dayAppts = appointments.filter((a) => {
            const apptDateStr = new Date(a.scheduled_at).toLocaleDateString(
              "en-CA",
              { timeZone: "America/Chicago" },
            );
            return apptDateStr === day.dateStr;
          });

          return (
            <div key={day.dateStr} className="flex flex-col min-h-[360px] p-3 space-y-3">
              {/* Day Header */}
              <div
                className={`rounded-xl p-2.5 text-center transition ${
                  day.isToday
                    ? "bg-brand-gold text-brand-ink font-bold shadow-sm"
                    : "bg-brand-cream/40 text-brand-slate"
                }`}
              >
                <p className="text-xs uppercase tracking-wider font-semibold">
                  {day.dayName}
                </p>
                <p className="font-serif text-lg font-bold text-brand-ink mt-0.5">
                  {day.dayNum} {day.monthName}
                </p>
                {day.isToday && (
                  <span className="inline-block mt-1 text-[9px] uppercase tracking-widest bg-brand-ink text-white px-2 py-0.5 rounded-full font-bold">
                    Today
                  </span>
                )}
              </div>

              {/* Appointments List for this Day */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {dayAppts.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-4 text-center">
                    <p className="text-[11px] text-brand-slate/60 italic">
                      No appointments
                    </p>
                  </div>
                ) : (
                  dayAppts.map((appt) => {
                    const timeStr = new Date(
                      appt.scheduled_at,
                    ).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: "America/Chicago",
                    });

                    const typeLabel =
                      APPOINTMENT_TYPES.find((t) => t.type === appt.type)
                        ?.label || appt.type;

                    return (
                      <div
                        key={appt.id}
                        onClick={() => onSelectAppointment(appt)}
                        className={`cursor-pointer rounded-xl border p-2.5 text-xs transition shadow-sm ${
                          statusColors[appt.status]
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] font-bold text-brand-ink">
                            {timeStr}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                              statusBadgeColors[appt.status]
                            }`}
                          >
                            {appt.status}
                          </span>
                        </div>

                        <p className="font-semibold text-brand-ink mt-1.5 truncate">
                          {appt.lead?.full_name || "Prospect"}
                        </p>

                        <p className="text-[10px] text-brand-slate truncate">
                          {typeLabel} · {appt.duration_minutes}m
                        </p>

                        {appt.agent && (
                          <p className="text-[10px] text-brand-slate/80 truncate mt-1 border-t border-brand-line/40 pt-1">
                            {appt.agent.full_name}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
