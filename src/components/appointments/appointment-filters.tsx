"use client";

import type { UserRole, AppointmentStatus } from "@/types/database";
import type {
  AppointmentViewMode,
  AppointmentSortOption,
} from "@/services/appointments/types";
import type { AgentSummary } from "@/services/agents";
import { APPOINTMENT_STATUSES } from "@/services/appointments/types";

interface AppointmentFiltersProps {
  currentView: AppointmentViewMode;
  currentDate: string; // YYYY-MM-DD
  currentStatus?: AppointmentStatus;
  currentAgentId?: string;
  currentSort?: AppointmentSortOption;
  agents: AgentSummary[];
  currentUserRole: UserRole;
  onViewChange: (view: AppointmentViewMode) => void;
  onDateChange: (date: string) => void;
  onStatusChange: (status?: AppointmentStatus) => void;
  onAgentChange: (agentId?: string) => void;
  onSortChange: (sort: AppointmentSortOption) => void;
  onNavigateOffset: (days: number) => void;
  onToday: () => void;
}

export function AppointmentFilters({
  currentView,
  currentDate,
  currentStatus,
  currentAgentId,
  currentSort = "soonest",
  agents = [],
  currentUserRole = "agent",
  onViewChange,
  onDateChange,
  onStatusChange,
  onAgentChange,
  onSortChange,
  onNavigateOffset,
  onToday,
}: AppointmentFiltersProps) {
  // Format current date for display
  const displayDateStr = new Date(`${currentDate}T12:00:00Z`).toLocaleDateString(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    },
  );

  return (
    <div className="rounded-2xl border border-brand-line bg-white p-4 space-y-4 shadow-sm">
      {/* Top Row: View Switcher & Date Navigator */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* View Mode Switcher */}
        <div className="flex items-center rounded-xl bg-brand-sand/40 p-1 border border-brand-line/60">
          <button
            type="button"
            onClick={() => onViewChange("day")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              currentView === "day"
                ? "bg-white text-brand-ink shadow-sm"
                : "text-brand-slate hover:text-brand-ink"
            }`}
          >
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Day View</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange("week")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              currentView === "week"
                ? "bg-white text-brand-ink shadow-sm"
                : "text-brand-slate hover:text-brand-ink"
            }`}
          >
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Week View</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange("list")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              currentView === "list"
                ? "bg-white text-brand-ink shadow-sm"
                : "text-brand-slate hover:text-brand-ink"
            }`}
          >
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
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <span>List View</span>
          </button>
        </div>

        {/* Date Navigator (for Day & Week views) */}
        {currentView !== "list" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateOffset(currentView === "week" ? -7 : -1)}
              aria-label="Previous"
              className="rounded-lg border border-brand-line bg-white p-2 text-brand-slate hover:bg-brand-sand hover:text-brand-ink transition shadow-sm"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={onToday}
              className="rounded-lg border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink hover:bg-brand-sand transition shadow-sm"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => onNavigateOffset(currentView === "week" ? 7 : 1)}
              aria-label="Next"
              className="rounded-lg border border-brand-line bg-white p-2 text-brand-slate hover:bg-brand-sand hover:text-brand-ink transition shadow-sm"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <div className="flex items-center gap-2 pl-2">
              <span className="text-xs font-serif font-bold text-brand-ink min-w-[140px]">
                {displayDateStr}
              </span>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="rounded-lg border border-brand-line bg-white px-2 py-1 text-xs text-brand-ink shadow-sm focus:border-brand-gold focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Row: Filters & Sort Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-brand-line/60">
        {/* Status Filter */}
        <div>
          <label className="block text-[10px] uppercase font-semibold tracking-wider text-brand-slate mb-1">
            Status
          </label>
          <select
            value={currentStatus || "all"}
            onChange={(e) =>
              onStatusChange(
                e.target.value === "all"
                  ? undefined
                  : (e.target.value as AppointmentStatus),
              )
            }
            className="w-full rounded-xl border border-brand-line bg-white px-3 py-1.5 text-xs text-brand-ink shadow-sm focus:border-brand-gold focus:outline-none capitalize"
          >
            <option value="all">All Statuses</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s.status} value={s.status}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Agent Filter (Admin Only) */}
        {currentUserRole === "admin" && (
          <div>
            <label className="block text-[10px] uppercase font-semibold tracking-wider text-brand-slate mb-1">
              Licensed Agent
            </label>
            <select
              value={currentAgentId || "all"}
              onChange={(e) =>
                onAgentChange(
                  e.target.value === "all" ? undefined : e.target.value,
                )
              }
              className="w-full rounded-xl border border-brand-line bg-white px-3 py-1.5 text-xs text-brand-ink shadow-sm focus:border-brand-gold focus:outline-none"
            >
              <option value="all">All Agents</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sorting Dropdown */}
        <div>
          <label className="block text-[10px] uppercase font-semibold tracking-wider text-brand-slate mb-1">
            Sort Order
          </label>
          <select
            value={currentSort}
            onChange={(e) =>
              onSortChange(e.target.value as AppointmentSortOption)
            }
            className="w-full rounded-xl border border-brand-line bg-white px-3 py-1.5 text-xs text-brand-ink shadow-sm focus:border-brand-gold focus:outline-none"
          >
            <option value="soonest">Soonest First</option>
            <option value="latest">Latest First</option>
            <option value="newest">Recently Created</option>
          </select>
        </div>

        {/* Timezone Indicator */}
        <div className="flex flex-col justify-end">
          <p className="text-[11px] text-brand-slate flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5 text-brand-gold shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Central Time (America/Chicago)</span>
          </p>
        </div>
      </div>
    </div>
  );
}
