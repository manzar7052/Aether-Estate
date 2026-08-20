"use client";

import { useState } from "react";
import { QualificationBadge } from "./qualification-badge";
import { AgentAssignmentControl } from "./agent-assignment-control";
import { ConversationTranscript } from "./conversation-transcript";
import { AIQualificationPanel } from "./ai-qualification-panel";
import { AppointmentBookingPanel } from "./appointment-booking-panel";
import { AppointmentHistory } from "./appointment-history";
import { CommunicationPreferences } from "./communication-preferences";
import { CommunicationHistory } from "./communication-history";
import type { Lead, LeadStatus, UserRole } from "@/types/database";
import type { AgentSummary } from "@/services/agents";

interface LeadDetailModalProps {
  lead: Lead | null;
  agents?: AgentSummary[];
  currentUserRole?: UserRole;
  onClose: () => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onAssign?: (leadId: string, agentId: string | null) => Promise<void>;
  onLeadUpdated?: (updatedLead: Lead) => void;
  isUpdating?: boolean;
}

export function LeadDetailModal({
  lead,
  agents = [],
  currentUserRole = "agent",
  onClose,
  onStatusChange,
  onAssign,
  onLeadUpdated,
  isUpdating = false,
}: LeadDetailModalProps) {
  const [apptRefreshKey, setApptRefreshKey] = useState(0);

  if (!lead) return null;

  const score = lead.lead_score ?? 0;
  const breakdown = lead.qualification_breakdown || {
    budget: 0,
    timeline: 0,
    engagement: 0,
    propertyFit: 0,
  };
  const reasons = lead.qualification_reasons || [];

  const formattedBudget =
    lead.budget_max || lead.budget_min
      ? lead.budget_min && lead.budget_max
        ? `$${lead.budget_min.toLocaleString()} – $${lead.budget_max.toLocaleString()}`
        : lead.budget_max
          ? `Up to $${lead.budget_max.toLocaleString()}`
          : `From $${lead.budget_min?.toLocaleString()}`
      : "Flexible / Unspecified";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brand-ink/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-brand-line bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-brand-line p-5 sm:p-6 bg-brand-cream/40">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-serif text-2xl font-bold text-brand-ink">
                {lead.full_name}
              </h3>
              <QualificationBadge lead={lead} size="md" />
            </div>
            <p className="mt-1 text-xs text-brand-slate">
              Lead ID: <span className="font-mono">{lead.id}</span> · Captured{" "}
              {new Date(lead.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-brand-slate hover:bg-brand-sand hover:text-brand-ink transition"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm">
          {/* Status & Agent Assignment Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-brand-sand/30 border border-brand-line p-4">
            {/* Status Control */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-brand-slate font-medium">Status:</span>
              <select
                value={lead.status}
                disabled={isUpdating}
                onChange={(e) =>
                  onStatusChange(lead.id, e.target.value as LeadStatus)
                }
                className="rounded-lg border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold capitalize text-brand-ink shadow-sm focus:border-brand-gold focus:outline-none"
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

            {/* Agent Assignment Control */}
            {onAssign ? (
              <AgentAssignmentControl
                lead={lead}
                agents={agents}
                currentUserRole={currentUserRole}
                onAssign={onAssign}
                isUpdating={isUpdating}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-slate">Assigned Agent:</span>
                <span className="rounded-full bg-brand-sand px-2.5 py-0.5 text-xs font-medium text-brand-ink">
                  {lead.assigned_agent_id ? "Assigned" : "Unassigned"}
                </span>
              </div>
            )}
          </div>

          {/* Contact & Preference Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contact Details */}
            <div className="rounded-xl border border-brand-line bg-white p-4 space-y-2.5">
              <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-brand-slate">
                Contact Information
              </h4>
              <div>
                <p className="text-xs text-brand-slate">Email</p>
                <a
                  href={`mailto:${lead.email}`}
                  className="font-medium text-brand-gold hover:underline"
                >
                  {lead.email}
                </a>
              </div>
              <div>
                <p className="text-xs text-brand-slate">Phone</p>
                {lead.phone ? (
                  <a
                    href={`tel:${lead.phone}`}
                    className="font-medium text-brand-ink hover:underline"
                  >
                    {lead.phone}
                  </a>
                ) : (
                  <p className="text-brand-slate/70 italic text-xs">
                    Not provided
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-brand-slate">Source</p>
                <span className="inline-block rounded-md bg-brand-sand px-2 py-0.5 text-xs font-medium text-brand-ink capitalize">
                  {lead.source.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Buying Preferences */}
            <div className="rounded-xl border border-brand-line bg-white p-4 space-y-2.5">
              <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-brand-slate">
                Property Criteria
              </h4>
              <div>
                <p className="text-xs text-brand-slate">Target Market</p>
                <p className="font-medium text-brand-ink">
                  {lead.city || "Any market"}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-slate">Property Type & Beds</p>
                <p className="font-medium text-brand-ink capitalize">
                  {lead.property_type || "Any type"}
                  {lead.bedrooms ? ` · ${lead.bedrooms} Beds` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-slate">Budget Range</p>
                <p className="font-medium text-brand-ink">{formattedBudget}</p>
              </div>
              <div>
                <p className="text-xs text-brand-slate">Timeline</p>
                <p className="font-medium text-brand-ink capitalize">
                  {lead.timeline
                    ? lead.timeline.replace(/_/g, " ")
                    : "Unspecified"}
                </p>
              </div>
            </div>
          </div>

          {/* Optional Message */}
          {lead.message && (
            <div className="rounded-xl border border-brand-line bg-white p-4">
              <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-brand-slate mb-1">
                Inquiry Message
              </h4>
              <p className="text-xs text-brand-ink/90 leading-relaxed italic bg-brand-cream/30 p-3 rounded-lg border border-brand-line/50">
                &ldquo;{lead.message}&rdquo;
              </p>
            </div>
          )}

          {/* Deterministic Qualification Breakdown Section */}
          <div className="rounded-xl border border-brand-line bg-brand-cream/30 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-line/60 pb-2">
              <div>
                <h4 className="font-serif font-bold text-sm text-brand-ink">
                  Deterministic Lead Qualification Evaluation
                </h4>
                <p className="text-xs text-brand-slate">
                  Authoritative Score: {score}/100 (
                  {lead.qualification_category?.toUpperCase() || "COLD"})
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-brand-line">
                Score: {score}
              </span>
            </div>

            {/* Metric Meters */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-brand-line/60">
                <div className="flex justify-between text-brand-slate mb-1">
                  <span>Budget Readiness</span>
                  <span className="font-bold text-brand-ink">
                    {breakdown.budget} / 30
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-brand-sand">
                  <div
                    className="h-1.5 rounded-full bg-brand-gold"
                    style={{ width: `${(breakdown.budget / 30) * 100}%` }}
                  />
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-brand-line/60">
                <div className="flex justify-between text-brand-slate mb-1">
                  <span>Timeline Urgency</span>
                  <span className="font-bold text-brand-ink">
                    {breakdown.timeline} / 30
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-brand-sand">
                  <div
                    className="h-1.5 rounded-full bg-brand-gold"
                    style={{ width: `${(breakdown.timeline / 30) * 100}%` }}
                  />
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-brand-line/60">
                <div className="flex justify-between text-brand-slate mb-1">
                  <span>Engagement Depth</span>
                  <span className="font-bold text-brand-ink">
                    {breakdown.engagement} / 20
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-brand-sand">
                  <div
                    className="h-1.5 rounded-full bg-brand-gold"
                    style={{ width: `${(breakdown.engagement / 20) * 100}%` }}
                  />
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-brand-line/60">
                <div className="flex justify-between text-brand-slate mb-1">
                  <span>Property Fit</span>
                  <span className="font-bold text-brand-ink">
                    {breakdown.propertyFit} / 20
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-brand-sand">
                  <div
                    className="h-1.5 rounded-full bg-brand-gold"
                    style={{ width: `${(breakdown.propertyFit / 20) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Reasons */}
            {reasons.length > 0 && (
              <div className="bg-white p-3.5 rounded-xl border border-brand-line/60">
                <p className="text-xs font-semibold text-brand-slate mb-2">
                  Scoring Criteria Met:
                </p>
                <ul className="space-y-1.5 text-xs text-brand-ink">
                  {reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-brand-gold font-bold">✓</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* AI-Assisted Qualification Intelligence Panel */}
          <AIQualificationPanel
            lead={lead}
            onLeadUpdated={onLeadUpdated || (() => {})}
          />

          {/* Appointment Booking */}
          <AppointmentBookingPanel
            lead={lead}
            onAppointmentBooked={() => setApptRefreshKey((k) => k + 1)}
          />

          {/* Appointment History */}
          <AppointmentHistory leadId={lead.id} refreshKey={apptRefreshKey} />

          {/* Communication Preferences */}
          <CommunicationPreferences
            lead={lead}
            onLeadUpdated={onLeadUpdated}
          />

          {/* Communication History Audit Timeline */}
          <CommunicationHistory
            leadId={lead.id}
            refreshKey={apptRefreshKey}
          />

          {/* Conversation Transcript Viewer */}
          <ConversationTranscript leadId={lead.id} />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-brand-line p-4 bg-brand-cream/20">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-brand-ink px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
