"use client";

import { LeadCard } from "./lead-card";
import type { Lead, LeadStatus } from "@/types/database";
import type { AgentSummary } from "@/services/agents";

interface KanbanViewProps {
  leads: Lead[];
  agents?: AgentSummary[];
  onSelectLead: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  updatingLeadId?: string | null;
}

const COLUMNS: {
  status: LeadStatus;
  label: string;
  badgeBg: string;
}[] = [
  { status: "new", label: "New", badgeBg: "bg-blue-100 text-blue-800" },
  {
    status: "qualifying",
    label: "Qualifying",
    badgeBg: "bg-amber-100 text-amber-800",
  },
  {
    status: "qualified",
    label: "Qualified",
    badgeBg: "bg-emerald-100 text-emerald-800",
  },
  {
    status: "nurturing",
    label: "Nurture",
    badgeBg: "bg-purple-100 text-purple-800",
  },
  {
    status: "appointment_set",
    label: "Appointment Set",
    badgeBg: "bg-indigo-100 text-indigo-800",
  },
  { status: "closed", label: "Closed", badgeBg: "bg-slate-200 text-slate-800" },
  { status: "lost", label: "Lost", badgeBg: "bg-gray-100 text-gray-700" },
];

export function KanbanView({
  leads,
  agents = [],
  onSelectLead,
  onStatusChange,
  updatingLeadId,
}: KanbanViewProps) {
  // Group leads by status
  const leadsByStatus = COLUMNS.reduce(
    (acc, col) => {
      acc[col.status] = leads.filter((lead) => lead.status === col.status);
      return acc;
    },
    {} as Record<LeadStatus, Lead[]>,
  );

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1300px]">
        {COLUMNS.map((col) => {
          const columnLeads = leadsByStatus[col.status] || [];

          return (
            <div
              key={col.status}
              className="flex-1 min-w-[240px] rounded-2xl border border-brand-line/80 bg-brand-cream/40 p-3.5 shadow-sm"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-brand-line/60 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-brand-ink">
                    {col.label}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${col.badgeBg}`}
                  >
                    {columnLeads.length}
                  </span>
                </div>
              </div>

              {/* Lead Cards List */}
              <div className="space-y-3 min-h-[150px]">
                {columnLeads.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-brand-line/80 bg-white/50 text-center p-3">
                    <p className="text-xs text-brand-slate/70">
                      No leads in {col.label.toLowerCase()}
                    </p>
                  </div>
                ) : (
                  columnLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      agents={agents}
                      onSelect={onSelectLead}
                      onStatusChange={onStatusChange}
                      isUpdating={updatingLeadId === lead.id}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
