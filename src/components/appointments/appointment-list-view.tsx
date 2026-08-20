"use client";

import type { AppointmentWithDetails } from "@/services/appointments/types";
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
} from "@/services/appointments/types";
import type { AppointmentStatus } from "@/types/database";
import { QualificationBadge } from "@/components/crm/qualification-badge";

interface AppointmentListViewProps {
  appointments: AppointmentWithDetails[];
  isLoading: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelectAppointment: (appointment: AppointmentWithDetails) => void;
}

export function AppointmentListView({
  appointments,
  isLoading,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  onSelectAppointment,
}: AppointmentListViewProps) {
  const statusBadgeColors: Record<AppointmentStatus, string> = {
    scheduled: "bg-blue-100 text-blue-800 border-blue-200",
    confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    completed: "bg-brand-sand text-brand-ink border-brand-line",
    cancelled: "bg-slate-100 text-slate-600 border-slate-200",
    no_show: "bg-rose-100 text-rose-800 border-rose-200",
  };

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-3xl border border-brand-line bg-white p-12">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-3 border-brand-gold border-t-transparent" />
          <p className="text-xs font-semibold text-brand-slate">
            Loading appointments list...
          </p>
        </div>
      </div>
    );
  }

  if (appointments.length === 0) {
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h4 className="font-serif text-base font-bold text-brand-ink">
          No appointments found
        </h4>
        <p className="text-xs text-brand-slate max-w-sm">
          No appointments matched your active filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-brand-line bg-white shadow-sm overflow-hidden space-y-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-brand-line bg-brand-cream/40 font-semibold uppercase tracking-wider text-brand-slate text-[10px]">
              <th className="py-3.5 px-4">Date & Time (CT)</th>
              <th className="py-3.5 px-4">Prospect</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Licensed Agent</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-line/60">
            {appointments.map((appt) => {
              const formattedDate = new Date(
                appt.scheduled_at,
              ).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "America/Chicago",
              });

              const formattedTime = new Date(
                appt.scheduled_at,
              ).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: "America/Chicago",
              });

              const typeLabel =
                APPOINTMENT_TYPES.find((t) => t.type === appt.type)?.label ||
                appt.type;

              const statusLabel =
                APPOINTMENT_STATUSES.find((s) => s.status === appt.status)
                  ?.label || appt.status;

              return (
                <tr
                  key={appt.id}
                  onClick={() => onSelectAppointment(appt)}
                  className="cursor-pointer hover:bg-brand-sand/20 transition"
                >
                  {/* Date & Time */}
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-brand-ink">
                      {formattedDate}
                    </p>
                    <p className="font-mono text-[11px] text-brand-slate">
                      {formattedTime} ({appt.duration_minutes} min)
                    </p>
                  </td>

                  {/* Prospect */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-brand-ink">
                        {appt.lead?.full_name || "Unknown Prospect"}
                      </p>
                      {appt.lead && (
                        <QualificationBadge
                          lead={appt.lead as unknown as import("@/types/database").Lead}
                          size="sm"
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-brand-slate">
                      {appt.lead?.email}
                    </p>
                  </td>

                  {/* Type */}
                  <td className="py-3.5 px-4 text-brand-ink font-medium">
                    {typeLabel}
                  </td>

                  {/* Agent */}
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-brand-ink">
                      {appt.agent?.full_name || "Unassigned"}
                    </p>
                    <p className="text-[11px] text-brand-slate">
                      {appt.agent?.email}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        statusBadgeColors[appt.status]
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAppointment(appt);
                      }}
                      className="rounded-lg border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink hover:bg-brand-sand transition shadow-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Server Pagination Bar */}
      <div className="flex items-center justify-between border-t border-brand-line p-4 bg-brand-cream/30 text-xs">
        <p className="text-brand-slate">
          Showing <span className="font-semibold text-brand-ink">{appointments.length}</span> of{" "}
          <span className="font-semibold text-brand-ink">{totalCount}</span> appointments
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="rounded-lg border border-brand-line bg-white px-3 py-1.5 font-semibold text-brand-ink hover:bg-brand-sand transition disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-brand-slate px-2">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="rounded-lg border border-brand-line bg-white px-3 py-1.5 font-semibold text-brand-ink hover:bg-brand-sand transition disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
