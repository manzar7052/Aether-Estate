"use client";

import { useState } from "react";
import type { Lead } from "@/types/database";
import type {
  AIQualificationSignals,
  QualificationConflict,
  SuggestedEnrichments,
} from "@/services/ai/qualification";

interface AIQualificationPanelProps {
  lead: Lead;
  onLeadUpdated: (updatedLead: Lead) => void;
}

export function AIQualificationPanel({
  lead,
  onLeadUpdated,
}: AIQualificationPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<QualificationConflict[]>([]);
  const [enrichments, setEnrichments] = useState<SuggestedEnrichments | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const signals = lead.ai_qualification_signals as AIQualificationSignals | null;
  const lastAnalyzed = lead.ai_qualification_updated_at
    ? new Date(lead.ai_qualification_updated_at).toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  async function handleAnalyze(applySuggestions = false) {
    if (applySuggestions) {
      setIsApplying(true);
    } else {
      setIsAnalyzing(true);
    }
    setError(null);
    setSuccessNotice(null);

    try {
      const res = await fetch(`/api/leads/${lead.id}/ai-qualification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applySuggestions }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "AI qualification analysis failed.");
      }

      setConflicts(data.conflicts || []);
      setEnrichments(data.suggestedEnrichments || null);

      if (data.lead) {
        onLeadUpdated(data.lead);
      }

      if (applySuggestions) {
        setSuccessNotice(
          "AI enrichments applied and lead score recalculated by the deterministic engine.",
        );
      } else {
        setSuccessNotice(
          `Analysis completed by ${data.model} in ${data.durationMs}ms.`,
        );
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete AI analysis. Existing lead score is unaffected.",
      );
    } finally {
      setIsAnalyzing(false);
      setIsApplying(false);
    }
  }

  return (
    <div className="rounded-2xl border border-brand-line bg-gradient-to-b from-brand-sand/30 to-brand-cream/30 p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-line/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gold text-brand-ink shadow-sm">
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-serif font-bold text-sm text-brand-ink">
              AI-Assisted Qualification Intelligence
            </h4>
            <p className="text-[11px] text-brand-slate">
              {lastAnalyzed ? (
                <>
                  Model:{" "}
                  <span className="font-medium text-brand-ink">
                    {lead.ai_qualification_model || "Gemini"}
                  </span>{" "}
                  · Analyzed {lastAnalyzed}
                </>
              ) : (
                "Extract structured purchase signals and dialogue evidence"
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isAnalyzing || isApplying}
          onClick={() => handleAnalyze(false)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-ink px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black transition disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-gold border-t-transparent inline-block" />
              <span>Analyzing Conversation...</span>
            </>
          ) : (
            <>
              <svg
                className="h-3.5 w-3.5 text-brand-gold"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <span>{signals ? "Re-Analyze with AI" : "Analyze Lead with AI"}</span>
            </>
          )}
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800">
          <p className="font-semibold">AI Analysis Notice:</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {successNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800 flex items-center justify-between">
          <span>{successNotice}</span>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="font-bold underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Signals Display */}
      {signals ? (
        <div className="space-y-4 text-xs">
          {/* Signal Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Buyer Intent */}
            <div className="rounded-xl border border-brand-line/70 bg-white p-3 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-brand-slate tracking-wider">
                Buyer Intent
              </span>
              <div className="flex items-center justify-between">
                <span
                  className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    signals.intent?.level === "high"
                      ? "bg-emerald-100 text-emerald-800"
                      : signals.intent?.level === "medium"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {signals.intent?.level || "Unspecified"}
                </span>
                <span className="text-[10px] text-brand-slate font-medium">
                  {signals.intent?.confidence
                    ? `${Math.round(signals.intent.confidence * 100)}% conf`
                    : "—"}
                </span>
              </div>
            </div>

            {/* Extracted Budget */}
            <div className="rounded-xl border border-brand-line/70 bg-white p-3 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-brand-slate tracking-wider">
                Detected Budget
              </span>
              <p className="font-bold text-brand-ink truncate">
                {signals.budget?.max || signals.budget?.min
                  ? signals.budget.min && signals.budget.max
                    ? `$${signals.budget.min.toLocaleString()} – $${signals.budget.max.toLocaleString()}`
                    : signals.budget.max
                      ? `Up to $${signals.budget.max.toLocaleString()}`
                      : `From $${signals.budget.min?.toLocaleString()}`
                  : "Not discussed"}
              </p>
              <p className="text-[10px] text-brand-slate">
                {signals.budget?.confidence
                  ? `${Math.round(signals.budget.confidence * 100)}% confidence`
                  : "—"}
              </p>
            </div>

            {/* Extracted Timeline */}
            <div className="rounded-xl border border-brand-line/70 bg-white p-3 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-brand-slate tracking-wider">
                Detected Timeline
              </span>
              <p className="font-bold text-brand-ink capitalize truncate">
                {signals.timeline?.value && signals.timeline.value !== "unknown"
                  ? signals.timeline.value.replace(/_/g, " ")
                  : "Unspecified"}
              </p>
              <p className="text-[10px] text-brand-slate">
                {signals.timeline?.confidence
                  ? `${Math.round(signals.timeline.confidence * 100)}% confidence`
                  : "—"}
              </p>
            </div>

            {/* Property Fit */}
            <div className="rounded-xl border border-brand-line/70 bg-white p-3 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-brand-slate tracking-wider">
                Criteria Match
              </span>
              <p className="font-bold text-brand-ink truncate">
                {signals.propertyFit?.location || "Any City"}
                {signals.propertyFit?.bedrooms
                  ? ` · ${signals.propertyFit.bedrooms} Beds`
                  : ""}
              </p>
              <p className="text-[10px] text-brand-slate">
                {signals.propertyFit?.confidence
                  ? `${Math.round(signals.propertyFit.confidence * 100)}% confidence`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Conflict Alert Banner */}
          {conflicts.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <svg
                  className="h-4 w-4 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>Potential Conflict Detected with Authoritative Lead Data</span>
              </div>
              <ul className="space-y-1.5 text-xs text-amber-800">
                {conflicts.map((c, idx) => (
                  <li key={idx} className="bg-white/60 p-2 rounded-lg border border-amber-200">
                    <p className="font-semibold">{c.description}</p>
                    {c.evidence.length > 0 && (
                      <p className="text-[11px] text-amber-700 italic mt-0.5">
                        &ldquo;{c.evidence[0]}&rdquo;
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-amber-700">
                Existing lead fields remain authoritative and were preserved to avoid accidental overwrites.
              </p>
            </div>
          )}

          {/* Evidence Quotes Breakdown */}
          <div className="rounded-xl border border-brand-line/70 bg-white p-3.5 space-y-2.5">
            <h5 className="font-serif font-bold text-xs uppercase tracking-wider text-brand-slate">
              Conversational Dialogue Evidence Quotes
            </h5>
            <div className="space-y-2">
              {signals.timeline?.evidence && signals.timeline.evidence.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-brand-slate text-[11px] min-w-[70px]">
                    Timeline:
                  </span>
                  <div className="text-[11px] text-brand-ink/90 italic bg-brand-sand/30 px-2.5 py-1 rounded-md flex-1">
                    &ldquo;{signals.timeline.evidence[0]}&rdquo;
                  </div>
                </div>
              )}
              {signals.budget?.evidence && signals.budget.evidence.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-brand-slate text-[11px] min-w-[70px]">
                    Budget:
                  </span>
                  <div className="text-[11px] text-brand-ink/90 italic bg-brand-sand/30 px-2.5 py-1 rounded-md flex-1">
                    &ldquo;{signals.budget.evidence[0]}&rdquo;
                  </div>
                </div>
              )}
              {signals.propertyFit?.evidence && signals.propertyFit.evidence.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-brand-slate text-[11px] min-w-[70px]">
                    Criteria:
                  </span>
                  <div className="text-[11px] text-brand-ink/90 italic bg-brand-sand/30 px-2.5 py-1 rounded-md flex-1">
                    &ldquo;{signals.propertyFit.evidence[0]}&rdquo;
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Non-Conflicting Enrichment Action */}
          {enrichments && Object.keys(enrichments).length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-white border border-brand-line p-3">
              <div>
                <p className="font-bold text-brand-ink">
                  New criteria discovered by AI
                </p>
                <p className="text-[11px] text-brand-slate">
                  Apply detected fields to populate missing prospect requirements.
                </p>
              </div>
              <button
                type="button"
                disabled={isApplying}
                onClick={() => handleAnalyze(true)}
                className="rounded-lg bg-brand-gold px-3 py-1.5 text-xs font-semibold text-brand-ink shadow-sm hover:brightness-105 transition disabled:opacity-50"
              >
                {isApplying ? "Applying..." : "Apply AI Enrichments"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-brand-line/80 bg-white/60 p-4 text-center">
          <p className="text-xs text-brand-slate">
            Click &ldquo;Analyze Lead with AI&rdquo; to extract purchase timeline, budget, criteria, and evidence quotes from the prospect&apos;s history.
          </p>
        </div>
      )}

      {/* Authoritative Disclaimer */}
      <div className="flex items-center gap-1.5 text-[10px] text-brand-slate/80 border-t border-brand-line/50 pt-2">
        <svg className="h-3 w-3 text-brand-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Gemini provides contextual interpretation. Authoritative lead scoring (0–100) and HOT/WARM/COLD tiers are calculated exclusively by the Phase 4A Qualification Engine.
        </span>
      </div>
    </div>
  );
}
