"use client";

import { QualificationBadge } from "./qualification-badge";
import type { Lead, LeadStatus } from "@/types/database";
import type { AgentSummary } from "@/services/agents";

interface TableViewProps {
  leads: Lead[];
  agents?: AgentSummary[];
  onSelectLead: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  updatingLeadId?: string | null;
}

export function TableView({
  leads,
  agents = [],
  onSelectLead,
  onStatusChange,
  updatingLeadId,
}: TableViewProps) {
  if (leads.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-brand-line bg-white p-6 text-center">
        <p className="font-serif text-lg font-bold text-brand-ink">
          No leads match your current filters
        </p>
        <p className="mt-1 text-xs text-brand-slate max-w-sm">
          Try resetting your filters or adjusting your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-line bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-brand-line bg-brand-cream/60 font-semibold uppercase tracking-wider text-brand-slate text-[11px]">
            <tr>
              <th scope="col" className="px-5 py-3.5">
                Prospect
              </th>
              <th scope="col" className="px-4 py-3.5">
                Contact
              </th>
              <th scope="col" className="px-4 py-3.5">
                Location
              </th>
              <th scope="col" className="px-4 py-3.5">
                Budget
              </th>
              <th scope="col" className="px-4 py-3.5">
                Assigned Agent
              </th>
              <th scope="col" className="px-4 py-3.5">
                Score
              </th>
              <th scope="col" className="px-4 py-3.5">
                Status
              </th>
              <th scope="col" className="px-4 py-3.5">
                Date
              </th>
              <th scope="col" className="px-4 py-3.5 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-line/60">
            {leads.map((lead) => {
              const formattedBudget =
                lead.budget_max || lead.budget_min
                  ? lead.budget_min && lead.budget_max
                    ? `$${lead.budget_min.toLocaleString()} – $${lead.budget_max.toLocaleString()}`
                    : lead.budget_max
                      ? `Up to $${lead.budget_max.toLocaleString()}`
                      : `From $${lead.budget_min?.toLocaleString()}`
                  : "Unspecified";

              const formattedDate = new Date(
                lead.created_at,
              ).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              const assignedAgent = agents.find(
                (a) => a.id === lead.assigned_agent_id,
              );

              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="cursor-pointer transition-colors hover:bg-brand-sand/30 group"
                >
                  {/* Name */}
                  <td className="px-5 py-4 font-medium text-brand-ink">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-sand font-serif font-bold text-xs text-brand-gold shrink-0">
                        {lead.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-serif font-bold text-sm text-brand-ink group-hover:text-brand-gold transition-colors">
                          {lead.full_name}
                        </p>
                        <span className="text-[10px] text-brand-slate uppercase tracking-wider">
                          via {lead.source}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-4 text-brand-slate">
                    <p className="font-medium text-brand-ink line-clamp-1">
                      {lead.email}
                    </p>
                    <p className="text-[11px] text-brand-slate">
                      {lead.phone || "No phone"}
                    </p>
                  </td>

                  {/* Location */}
                  <td className="px-4 py-4 text-brand-ink">
                    {lead.city || <span className="text-brand-slate/60">—</span>}
                  </td>

                  {/* Budget */}
                  <td className="px-4 py-4 font-medium text-brand-ink">
                    {formattedBudget}
                  </td>

                  {/* Assigned Agent */}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                        lead.assigned_agent_id
                          ? "bg-brand-sand/70 text-brand-ink"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {assignedAgent ? assignedAgent.full_name : "Unassigned"}
                    </span>
                  </td>

                  {/* Qualification Score */}
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <QualificationBadge lead={lead} size="sm" />
                  </td>

                  {/* Status Dropdown */}
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.status}
                      disabled={updatingLeadId === lead.id}
                      onChange={(e) =>
                        onStatusChange(lead.id, e.target.value as LeadStatus)
                      }
                      className="rounded-lg border border-brand-line bg-white px-2 py-1 text-xs font-semibold capitalize text-brand-ink shadow-sm focus:border-brand-gold focus:outline-none"
                    >
                      <option value="new">New</option>
                      <option value="qualifying">Qualifying</option>
                      <option value="qualified">Qualified</option>
                      <option value="nurturing">Nurture</option>
                      <option value="appointment_set">Appointment Set</option>
                      <option value="closed">Closed</option>
                      <option value="lost">Lost</option>
                    </select>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-4 text-brand-slate whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectLead(lead)}
                      className="rounded-lg border border-brand-line bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-ink shadow-sm hover:bg-brand-sand transition"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
