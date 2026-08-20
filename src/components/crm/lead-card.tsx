"use client";

import { QualificationBadge } from "./qualification-badge";
import type { Lead, LeadStatus } from "@/types/database";
import type { AgentSummary } from "@/services/agents";

interface LeadCardProps {
  lead: Lead;
  agents?: AgentSummary[];
  onSelect: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  isUpdating?: boolean;
}

export function LeadCard({
  lead,
  agents = [],
  onSelect,
  onStatusChange,
  isUpdating = false,
}: LeadCardProps) {
  const formattedBudget =
    lead.budget_max || lead.budget_min
      ? lead.budget_min && lead.budget_max
        ? `$${lead.budget_min.toLocaleString()} – $${lead.budget_max.toLocaleString()}`
        : lead.budget_max
          ? `Up to $${lead.budget_max.toLocaleString()}`
          : `From $${lead.budget_min?.toLocaleString()}`
      : "Flexible / Unspecified";

  const formattedDate = new Date(lead.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const assignedAgent = agents.find((a) => a.id === lead.assigned_agent_id);

  return (
    <div
      onClick={() => onSelect(lead)}
      className="group relative cursor-pointer rounded-xl border border-brand-line bg-white p-4 shadow-sm transition-all hover:border-brand-gold/60 hover:shadow-md"
    >
      {/* Top row: Name & Qualification */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-serif font-bold text-brand-ink text-sm group-hover:text-brand-gold transition-colors">
            {lead.full_name}
          </h4>
          <p className="text-xs text-brand-slate line-clamp-1 mt-0.5">
            {lead.email}
          </p>
        </div>
        <QualificationBadge lead={lead} size="sm" />
      </div>

      {/* Details list */}
      <div className="mt-3 space-y-1.5 text-xs text-brand-slate">
        {lead.city && (
          <div className="flex items-center gap-1.5">
            <svg
              className="h-3.5 w-3.5 text-brand-gold shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="truncate">{lead.city}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <svg
            className="h-3.5 w-3.5 text-brand-gold shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium text-brand-ink/90 truncate">
            {formattedBudget}
          </span>
        </div>

        {lead.timeline && (
          <div className="flex items-center gap-1.5">
            <svg
              className="h-3.5 w-3.5 text-brand-gold shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="capitalize">{lead.timeline.replace(/_/g, " ")}</span>
          </div>
        )}

        {/* Assigned Agent Indicator */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <svg
            className="h-3.5 w-3.5 text-brand-slate shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="text-[11px] text-brand-slate truncate">
            {assignedAgent ? assignedAgent.full_name : "Unassigned"}
          </span>
        </div>
      </div>

      {/* Bottom Footer: Status Selector & Date */}
      <div
        className="mt-3.5 flex items-center justify-between border-t border-brand-line/60 pt-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[11px] text-brand-slate/80">{formattedDate}</span>

        <select
          value={lead.status}
          disabled={isUpdating}
          onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
          className="rounded-lg border border-brand-line bg-brand-cream/50 px-2 py-1 text-[11px] font-semibold text-brand-ink focus:border-brand-gold focus:outline-none capitalize transition"
        >
          <option value="new">New</option>
          <option value="qualifying">Qualifying</option>
          <option value="qualified">Qualified</option>
          <option value="nurturing">Nurture</option>
          <option value="appointment_set">Appointment Set</option>
          <option value="closed">Closed</option>
          <option value="lost">Lost</option>
        </select>
      </div>
    </div>
  );
}
