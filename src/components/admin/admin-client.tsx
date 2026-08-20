"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { CRMMetrics } from "@/components/crm/crm-metrics";
import { QualificationBadge } from "@/components/crm/qualification-badge";
import { LeadDetailModal } from "@/components/crm/lead-detail-modal";
import type { Lead, LeadStatus, Profile } from "@/types/database";
import type { CRMSummaryMetrics } from "@/services/leads";
import type { AgentSummary } from "@/services/agents";

interface AdminClientProps {
  initialLeads: Lead[];
  totalCount: number;
  metrics: CRMSummaryMetrics;
  currentProfile: Profile;
  agents: AgentSummary[];
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminClient({
  initialLeads,
  totalCount,
  metrics,
  currentProfile,
  agents = [],
}: AdminClientProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Status Change Handler with Optimistic UI & Server Sync
  async function handleStatusChange(leadId: string, newStatus: LeadStatus) {
    setUpdatingLeadId(leadId);
    setErrorMessage(null);
    setSuccessMessage(null);

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
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update lead status.");
      }

      setLeads((current) =>
        current.map((lead) => (lead.id === leadId ? data.lead : lead)),
      );
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(data.lead);
      }
      setSuccessMessage(`Lead status updated to ${newStatus.replace("_", " ")}.`);
      router.refresh();
    } catch (err: unknown) {
      console.error("[AdminClient] Status update failed:", err);
      setLeads(previousLeads);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update status. Please try again.",
      );
    } finally {
      setUpdatingLeadId(null);
    }
  }

  // Agent Assignment Handler
  async function handleAssign(leadId: string, agentId: string | null) {
    setUpdatingLeadId(leadId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/leads/${leadId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to assign agent.");
      }

      setLeads((current) =>
        current.map((lead) => (lead.id === leadId ? data.lead : lead)),
      );
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(data.lead);
      }
      setSuccessMessage(
        agentId ? "Agent assigned successfully." : "Lead unassigned successfully.",
      );
      router.refresh();
    } catch (err: unknown) {
      console.error("[AdminClient] Assignment failed:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to assign agent.",
      );
    } finally {
      setUpdatingLeadId(null);
    }
  }

  // Lead Updated Callback (e.g. from recalculating AI qualification or booking)
  function handleLeadUpdated(updatedLead: Lead) {
    setLeads((current) =>
      current.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)),
    );
    setSelectedLead(updatedLead);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Toast Alerts */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 animate-in fade-in">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold text-red-600 hover:text-red-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
      {successMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 animate-in fade-in">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-line pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-brand-ink">
              Admin Portal
            </h1>
            <span className="rounded-md bg-brand-gold/15 px-2.5 py-0.5 text-xs font-semibold text-brand-gold border border-brand-gold/30">
              EXECUTIVE ACCESS
            </span>
          </div>
          <p className="mt-1 text-sm text-brand-slate">
            Executive oversight, live inbound inquiries stream, and multi-agent pipeline controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/leads"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-ink px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-black transition cursor-pointer"
          >
            <span>Open Leads CRM</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* High-Level CRM Metrics */}
      <CRMMetrics metrics={metrics} />

      {/* Recent Inquiries & Inbound Leads Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-brand-ink">
              Recent Inquiries &amp; Inbound Leads
            </h2>
            <p className="text-xs text-brand-slate">
              Click &quot;Manage&quot; on any prospect to view full details, update status, assign agents, or trigger AI qualification.
            </p>
          </div>
          <Link
            href="/dashboard/leads"
            className="text-xs font-semibold text-brand-gold hover:text-brand-ink transition-colors cursor-pointer"
          >
            View All in CRM ({totalCount}) &rarr;
          </Link>
        </div>

        <Card className="overflow-hidden border border-brand-line/80 p-0 shadow-sm">
          {leads.length === 0 ? (
            <div className="p-12 text-center text-brand-slate">
              <p className="text-sm font-medium">No inquiries received yet.</p>
              <p className="mt-1 text-xs text-brand-slate/60">
                Submit an inquiry on any property page or through the AI Concierge to test the live stream.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-brand-sand/60 text-[11px] font-semibold uppercase tracking-wider text-brand-ink/70 border-b border-brand-line">
                  <tr>
                    <th className="px-5 py-3.5">Prospect</th>
                    <th className="px-5 py-3.5">Inquiry / Property</th>
                    <th className="px-5 py-3.5">Qualification</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-line/60 bg-white">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="hover:bg-brand-sand/40 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-brand-ink text-sm">{lead.full_name}</div>
                        <div className="text-[11px] text-brand-slate mt-0.5">{lead.email}</div>
                        {lead.phone && (
                          <div className="text-[10px] text-brand-slate/70 mt-0.5">{lead.phone}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        {lead.city && (
                          <span className="inline-block rounded bg-brand-sand px-1.5 py-0.5 text-[10px] font-medium text-brand-ink/80 mb-1">
                            {lead.city} {lead.property_type ? `• ${lead.property_type}` : ""}
                          </span>
                        )}
                        <p className="text-xs text-brand-ink/80 line-clamp-2">
                          {lead.message || "Requested property details & advisor consultation."}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <QualificationBadge lead={lead} size="sm" />
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 capitalize border border-blue-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          {lead.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-brand-slate text-[11px] whitespace-nowrap">
                        {formatDate(lead.created_at)}
                      </td>
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedLead(lead)}
                          className="inline-flex items-center gap-1 rounded-sm border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink hover:bg-brand-ink hover:text-white transition-colors cursor-pointer shadow-2xs"
                        >
                          <span>Manage</span>
                          <span>&rarr;</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Admin Modules & Profile Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-brand-line/60 pb-3">
            <h2 className="font-serif text-lg font-bold text-brand-ink">
              Quick Portals &amp; Tools
            </h2>
            <span className="text-xs font-semibold text-brand-gold uppercase tracking-wider">
              Navigation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Link
              href="/dashboard/leads"
              className="flex flex-col p-4 rounded-sm border border-brand-line bg-brand-sand/30 hover:bg-brand-sand hover:border-brand-gold/50 transition-all group cursor-pointer"
            >
              <span className="text-xs font-semibold text-brand-ink group-hover:text-brand-gold transition-colors">
                Leads CRM Pipeline &rarr;
              </span>
              <span className="text-[11px] text-brand-slate mt-1">
                Kanban stages, agent assignment, and AI breakdown
              </span>
            </Link>

            <Link
              href="/dashboard/appointments"
              className="flex flex-col p-4 rounded-sm border border-brand-line bg-brand-sand/30 hover:bg-brand-sand hover:border-brand-gold/50 transition-all group cursor-pointer"
            >
              <span className="text-xs font-semibold text-brand-ink group-hover:text-brand-gold transition-colors">
                Appointments &rarr;
              </span>
              <span className="text-[11px] text-brand-slate mt-1">
                Live showing schedule and calendar conflict locks
              </span>
            </Link>

            <Link
              href="/properties"
              className="flex flex-col p-4 rounded-sm border border-brand-line bg-brand-sand/30 hover:bg-brand-sand hover:border-brand-gold/50 transition-all group cursor-pointer"
            >
              <span className="text-xs font-semibold text-brand-ink group-hover:text-brand-gold transition-colors">
                Properties Catalog &rarr;
              </span>
              <span className="text-[11px] text-brand-slate mt-1">
                Explore listings and test front-end inquiries
              </span>
            </Link>

            <Link
              href="/dashboard"
              className="flex flex-col p-4 rounded-sm border border-brand-line bg-brand-sand/30 hover:bg-brand-sand hover:border-brand-gold/50 transition-all group cursor-pointer"
            >
              <span className="text-xs font-semibold text-brand-ink group-hover:text-brand-gold transition-colors">
                Staff Overview &rarr;
              </span>
              <span className="text-[11px] text-brand-slate mt-1">
                Performance dashboard and summary analytics
              </span>
            </Link>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-brand-line/60 pb-3">
            <h2 className="font-serif text-lg font-bold text-brand-ink">
              Admin Profile &amp; Security
            </h2>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              PostgreSQL RLS Active
            </span>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-1">
              <dt className="text-brand-slate text-xs font-medium uppercase tracking-wider">Signed In User</dt>
              <dd className="font-semibold text-brand-ink">{currentProfile.full_name}</dd>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-brand-line/40">
              <dt className="text-brand-slate text-xs font-medium uppercase tracking-wider">Email Address</dt>
              <dd className="font-mono text-xs text-brand-ink">{currentProfile.email}</dd>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-brand-line/40">
              <dt className="text-brand-slate text-xs font-medium uppercase tracking-wider">Staff Role</dt>
              <dd className="capitalize font-bold text-brand-gold">{currentProfile.role}</dd>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-brand-line/40">
              <dt className="text-brand-slate text-xs font-medium uppercase tracking-wider">Access Scope</dt>
              <dd className="text-xs text-emerald-700 font-medium">All Leads &amp; Multi-Agent Records</dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Interactive Lead Detail & AI Qualification Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          agents={agents}
          currentUserRole="admin"
          onClose={() => setSelectedLead(null)}
          onStatusChange={handleStatusChange}
          onAssign={handleAssign}
          onLeadUpdated={handleLeadUpdated}
          isUpdating={updatingLeadId === selectedLead.id}
        />
      )}
    </div>
  );
}
