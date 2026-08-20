"use client";

import { useState, useEffect } from "react";
import type { UserRole, AppointmentStatus } from "@/types/database";
import type {
  AppointmentWithDetails,
  AppointmentViewMode,
  AppointmentSortOption,
} from "@/services/appointments/types";
import type { AgentSummary } from "@/services/agents";
import { AppointmentFilters } from "./appointment-filters";
import { AppointmentCalendar } from "./appointment-calendar";
import { AppointmentListView } from "./appointment-list-view";
import { AppointmentDetailModal } from "./appointment-detail-modal";

interface AppointmentsClientProps {
  initialAppointments: AppointmentWithDetails[];
  initialTotalCount: number;
  agents: AgentSummary[];
  currentUserRole: UserRole;
  currentUserId: string;
}

export function AppointmentsClient({
  initialAppointments,
  initialTotalCount,
  agents = [],
  currentUserRole = "agent",
}: AppointmentsClientProps) {
  // Get today's date in Central Time (America/Chicago)
  const todayInCentral = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Chicago",
  });

  const [viewMode, setViewMode] = useState<AppointmentViewMode>("week");
  const [currentDate, setCurrentDate] = useState<string>(todayInCentral);
  const [currentStatus, setCurrentStatus] = useState<AppointmentStatus | undefined>();
  const [currentAgentId, setCurrentAgentId] = useState<string | undefined>();
  const [currentSort, setCurrentSort] = useState<AppointmentSortOption>("soonest");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const [appointments, setAppointments] =
    useState<AppointmentWithDetails[]>(initialAppointments);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [totalPages, setTotalPages] = useState(
    Math.ceil(initialTotalCount / pageSize) || 1,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithDetails | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);

      try {
        const params = new URLSearchParams();

        // Calculate date range based on viewMode
        if (viewMode === "day") {
          params.set("from", `${currentDate}T00:00:00Z`);
          params.set("to", `${currentDate}T23:59:59Z`);
        } else if (viewMode === "week") {
          // Find Monday of the selected week
          const selDate = new Date(`${currentDate}T12:00:00Z`);
          const dayOfWeek = selDate.getUTCDay();
          const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          const mon = new Date(selDate);
          mon.setUTCDate(selDate.getUTCDate() + diffToMon);
          const fri = new Date(mon);
          fri.setUTCDate(mon.getUTCDate() + 4);

          params.set("from", `${mon.toISOString().split("T")[0]}T00:00:00Z`);
          params.set("to", `${fri.toISOString().split("T")[0]}T23:59:59Z`);
        }

        if (currentStatus) {
          params.set("status", currentStatus);
        }
        if (currentUserRole === "admin" && currentAgentId) {
          params.set("agentId", currentAgentId);
        }
        if (currentSort) {
          params.set("sort", currentSort);
        }

        params.set("page", String(currentPage));
        params.set("pageSize", String(pageSize));

        const res = await fetch(`/api/appointments?${params.toString()}`);
        const data = await res.json();

        if (active && res.ok && data.appointments) {
          setAppointments(data.appointments);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        if (active) {
          console.error("[AppointmentsClient] Fetch error:", err);
        }
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
  }, [
    viewMode,
    currentDate,
    currentStatus,
    currentAgentId,
    currentSort,
    currentPage,
    currentUserRole,
  ]);

  function handleNavigateOffset(days: number) {
    const d = new Date(`${currentDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    setCurrentDate(d.toISOString().split("T")[0]);
  }

  function handleToday() {
    setCurrentDate(todayInCentral);
  }

  function handleStatusUpdated(updated: AppointmentWithDetails) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
    setSelectedAppointment(updated);
  }

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <AppointmentFilters
        currentView={viewMode}
        currentDate={currentDate}
        currentStatus={currentStatus}
        currentAgentId={currentAgentId}
        currentSort={currentSort}
        agents={agents}
        currentUserRole={currentUserRole}
        onViewChange={(v) => {
          setViewMode(v);
          setCurrentPage(1);
        }}
        onDateChange={setCurrentDate}
        onStatusChange={(st) => {
          setCurrentStatus(st);
          setCurrentPage(1);
        }}
        onAgentChange={(ag) => {
          setCurrentAgentId(ag);
          setCurrentPage(1);
        }}
        onSortChange={setCurrentSort}
        onNavigateOffset={handleNavigateOffset}
        onToday={handleToday}
      />

      {/* Main Content Area */}
      {viewMode === "list" ? (
        <AppointmentListView
          appointments={appointments}
          isLoading={isLoading}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onSelectAppointment={setSelectedAppointment}
        />
      ) : (
        <AppointmentCalendar
          viewMode={viewMode}
          currentDate={currentDate}
          appointments={appointments}
          isLoading={isLoading}
          onSelectAppointment={setSelectedAppointment}
        />
      )}

      {/* Appointment Detail Modal */}
      <AppointmentDetailModal
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}
