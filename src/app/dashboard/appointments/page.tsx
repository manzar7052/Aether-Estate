import { requireStaff } from "@/lib/auth/session";
import { getAppointmentsForCalendar } from "@/services/appointments";
import { listAssignableAgents, type AgentSummary } from "@/services/agents";
import { AppointmentsClient } from "@/components/appointments/appointments-client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Appointments | Staff Portal — Aether Estates",
  description:
    "View, schedule, and manage property viewing and consultation appointments.",
};

export default async function AppointmentsPage() {
  // 1. Authorize staff caller identity and role
  const { profile } = await requireStaff();

  // 2. Fetch assignable agents list for admin selectors
  let agents: AgentSummary[] = [];
  if (profile.role === "admin") {
    try {
      agents = await listAssignableAgents();
    } catch {
      agents = [];
    }
  }

  // 3. Fetch initial week appointments
  const todayInCentral = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Chicago",
  });
  const selDate = new Date(`${todayInCentral}T12:00:00Z`);
  const dayOfWeek = selDate.getUTCDay();
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mon = new Date(selDate);
  mon.setUTCDate(selDate.getUTCDate() + diffToMon);
  const fri = new Date(mon);
  fri.setUTCDate(mon.getUTCDate() + 4);

  let initialAppointments: Awaited<
    ReturnType<typeof getAppointmentsForCalendar>
  > = {
    appointments: [],
    totalCount: 0,
    page: 1,
    pageSize: 25,
    totalPages: 1,
  };

  try {
    initialAppointments = await getAppointmentsForCalendar({
      from: `${mon.toISOString().split("T")[0]}T00:00:00Z`,
      to: `${fri.toISOString().split("T")[0]}T23:59:59Z`,
      pageSize: 50,
    });
  } catch (err) {
    console.error("[AppointmentsPage] Initial load error:", err);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-line pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-ink">
            Appointments
          </h1>
          <p className="text-sm text-brand-slate mt-1">
            {profile.role === "admin"
              ? "View and manage scheduled property viewings & consultations across all licensed agents."
              : "View and manage your scheduled prospect viewings & client consultations."}
          </p>
        </div>
      </div>

      {/* Interactive Appointments Workspace */}
      <AppointmentsClient
        initialAppointments={initialAppointments.appointments}
        initialTotalCount={initialAppointments.totalCount}
        agents={agents}
        currentUserRole={profile.role}
        currentUserId={profile.id}
      />
    </div>
  );
}
