"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CRMHeader } from "./crm-header";
import { CRMMetrics } from "./crm-metrics";
import { CRMFilters } from "./crm-filters";
import { KanbanView } from "./kanban-view";
import { TableView } from "./table-view";
import { LeadDetailModal } from "./lead-detail-modal";
import { CRMPagination } from "./crm-pagination";
import type { Lead, LeadStatus, Profile } from "@/types/database";
import type { CRMSummaryMetrics, CRMLeadsQueryResult } from "@/services/leads";
import type { AgentSummary } from "@/services/agents";

interface CRMClientProps {
  initialData: CRMLeadsQueryResult;
  metrics: CRMSummaryMetrics;
  currentProfile: Profile;
  agents?: AgentSummary[];
  searchParams: {
    status?: string;
    qualification?: string;
    assignedAgentId?: string;
    minBudget?: string;
    from?: string;
    to?: string;
    search?: string;
    sort?: string;
    view?: "kanban" | "table";
  };
}

export function CRMClient({
  initialData,
  metrics,
  currentProfile,
  agents = [],
  searchParams,
}: CRMClientProps) {
  const router = useRouter();
  const currentView = searchParams.view === "table" ? "table" : "kanban";

  const [leads, setLeads] = useState<Lead[]>(initialData.leads);
  const [prevInitialLeads, setPrevInitialLeads] = useState<Lead[]>(initialData.leads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Idiomatically adjust state when initialData prop changes
  if (initialData.leads !== prevInitialLeads) {
    setPrevInitialLeads(initialData.leads);
    setLeads(initialData.leads);
  }

  async function handleStatusChange(leadId: string, newStatus: LeadStatus) {
    setUpdatingLeadId(leadId);
    setErrorMessage(null);

    // 1. Optimistic UI update
    const previousLeads = [...leads];
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead,
      ),
    );

    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      // 2. Call server status mutation API
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update status.");
      }

      // Update with server confirmed lead record
      setLeads((current) =>
        current.map((lead) => (lead.id === leadId ? data.lead : lead)),
      );
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(data.lead);
      }

      router.refresh();
    } catch (err: unknown) {
      console.error("[CRMClient] Status update failed:", err);
      // Rollback on error
      setLeads(previousLeads);
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to update lead status.",
      );
    } finally {
      setUpdatingLeadId(null);
    }
  }

  async function handleAssignLead(leadId: string, agentId: string | null) {
    setUpdatingLeadId(leadId);
    setErrorMessage(null);

    const previousLeads = [...leads];
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId ? { ...lead, assigned_agent_id: agentId } : lead,
      ),
    );

    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) =>
        prev ? { ...prev, assigned_agent_id: agentId } : null,
      );
    }

    try {
      const res = await fetch(`/api/leads/${leadId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to assign lead.");
      }

      setLeads((current) =>
        current.map((lead) => (lead.id === leadId ? data.lead : lead)),
      );
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(data.lead);
      }

      router.refresh();
    } catch (err: unknown) {
      console.error("[CRMClient] Lead assignment failed:", err);
      setLeads(previousLeads);
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to assign lead.",
      );
    } finally {
      setUpdatingLeadId(null);
    }
  }

  function handleLeadUpdated(updatedLead: Lead) {
    setLeads((current) =>
      current.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)),
    );
    setSelectedLead(updatedLead);
    router.refresh();
  }

  return (
    <div>
      {/* Header */}
      <CRMHeader currentView={currentView} />

      {/* Summary Metrics */}
      <CRMMetrics metrics={metrics} />

      {/* Search & Filters */}
      <CRMFilters
        currentStatus={searchParams.status}
        currentQualification={searchParams.qualification}
        currentAssignedAgentId={searchParams.assignedAgentId}
        currentMinBudget={searchParams.minBudget}
        currentFrom={searchParams.from}
        currentTo={searchParams.to}
        currentSearch={searchParams.search}
        currentSort={searchParams.sort}
        agents={agents}
        currentUserRole={currentProfile.role}
      />

      {/* Error notification banner */}
      {errorMessage && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-bold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active View: Kanban vs Table */}
      {currentView === "kanban" ? (
        <KanbanView
          leads={leads}
          agents={agents}
          onSelectLead={setSelectedLead}
          onStatusChange={handleStatusChange}
          updatingLeadId={updatingLeadId}
        />
      ) : (
        <TableView
          leads={leads}
          agents={agents}
          onSelectLead={setSelectedLead}
          onStatusChange={handleStatusChange}
          updatingLeadId={updatingLeadId}
        />
      )}

      {/* Pagination */}
      <CRMPagination
        page={initialData.page}
        pageSize={initialData.pageSize}
        totalPages={initialData.totalPages}
        totalCount={initialData.totalCount}
      />

      {/* Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        agents={agents}
        currentUserRole={currentProfile.role}
        onClose={() => setSelectedLead(null)}
        onStatusChange={handleStatusChange}
        onAssign={currentProfile.role === "admin" ? handleAssignLead : undefined}
        onLeadUpdated={handleLeadUpdated}
        isUpdating={updatingLeadId === selectedLead?.id}
      />
    </div>
  );
}
