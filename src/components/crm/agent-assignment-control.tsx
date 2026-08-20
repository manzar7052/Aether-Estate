"use client";

import { useState } from "react";
import type { AgentSummary } from "@/services/agents";
import type { Lead, UserRole } from "@/types/database";

interface AgentAssignmentControlProps {
  lead: Lead;
  agents: AgentSummary[];
  currentUserRole: UserRole;
  onAssign: (leadId: string, agentId: string | null) => Promise<void>;
  isUpdating?: boolean;
}

export function AgentAssignmentControl({
  lead,
  agents,
  currentUserRole,
  onAssign,
  isUpdating = false,
}: AgentAssignmentControlProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assignedAgent = agents.find((a) => a.id === lead.assigned_agent_id);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const newAgentId = value === "unassigned" ? null : value;
    setIsSubmitting(true);
    try {
      await onAssign(lead.id, newAgentId);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Admin: Interactive assignment dropdown
  if (currentUserRole === "admin") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-brand-slate font-medium">Assigned Agent:</span>
        <div className="relative">
          <select
            value={lead.assigned_agent_id || "unassigned"}
            disabled={isUpdating || isSubmitting}
            onChange={handleChange}
            className="rounded-lg border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink shadow-sm focus:border-brand-gold focus:outline-none transition disabled:opacity-50"
          >
            <option value="unassigned">— Unassigned —</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.full_name} ({agent.email})
              </option>
            ))}
          </select>
          {(isUpdating || isSubmitting) && (
            <div className="absolute right-2 top-2.5">
              <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-brand-gold border-t-transparent inline-block" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Agent: Read-only badge
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-brand-slate">Assigned Agent:</span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          lead.assigned_agent_id
            ? "bg-brand-sand/80 text-brand-ink"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            lead.assigned_agent_id ? "bg-emerald-500" : "bg-slate-400"
          }`}
        />
        <span>
          {assignedAgent
            ? assignedAgent.full_name
            : lead.assigned_agent_id
              ? "Assigned Agent"
              : "Unassigned"}
        </span>
      </span>
    </div>
  );
}
