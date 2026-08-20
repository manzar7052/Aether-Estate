"use client";

import { useState } from "react";
import type { Lead } from "@/types/database";

interface QualificationBadgeProps {
  lead: Lead;
  size?: "sm" | "md";
  showPopover?: boolean;
}

export function QualificationBadge({
  lead,
  size = "md",
  showPopover = true,
}: QualificationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const score = lead.lead_score ?? 0;
  const category = (lead.qualification_category ||
    (score >= 80 ? "hot" : score >= 50 ? "warm" : "cold")) as
    | "hot"
    | "warm"
    | "cold";

  const breakdown = lead.qualification_breakdown || {
    budget: 0,
    timeline: 0,
    engagement: 0,
    propertyFit: 0,
  };

  const reasons = lead.qualification_reasons || [];

  const styleConfig = {
    hot: {
      bg: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100",
      dot: "bg-rose-500",
      label: "HOT",
    },
    warm: {
      bg: "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100",
      dot: "bg-amber-500",
      label: "WARM",
    },
    cold: {
      bg: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100",
      dot: "bg-slate-400",
      label: "COLD",
    },
  }[category];

  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2 py-0.5 gap-1.5"
      : "text-xs px-2.5 py-1 gap-2";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          if (showPopover) {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }
        }}
        className={`inline-flex items-center rounded-full border font-semibold tracking-wide transition-colors ${styleConfig.bg} ${sizeClasses}`}
        title="Click to view score breakdown"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${styleConfig.dot}`} />
        <span>
          {styleConfig.label} · {score}
        </span>
      </button>

      {/* Popover / Tooltip */}
      {showPopover && isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div
            className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-brand-line bg-white p-4 shadow-xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-brand-line pb-2 mb-3">
              <div>
                <p className="text-xs font-semibold text-brand-slate uppercase tracking-wider">
                  Qualification Score
                </p>
                <p className="text-base font-bold text-brand-ink">
                  {score} / 100 ({styleConfig.label})
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${styleConfig.bg}`}
              >
                {category}
              </span>
            </div>

            {/* Breakdown meters */}
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-brand-slate mb-1">
                  <span>Budget Readiness</span>
                  <span className="font-semibold text-brand-ink">
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

              <div>
                <div className="flex justify-between text-brand-slate mb-1">
                  <span>Timeline Urgency</span>
                  <span className="font-semibold text-brand-ink">
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

              <div>
                <div className="flex justify-between text-brand-slate mb-1">
                  <span>Engagement Depth</span>
                  <span className="font-semibold text-brand-ink">
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

              <div>
                <div className="flex justify-between text-brand-slate mb-1">
                  <span>Property Fit</span>
                  <span className="font-semibold text-brand-ink">
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

            {/* Reasons List */}
            {reasons.length > 0 && (
              <div className="mt-3 border-t border-brand-line pt-2">
                <p className="text-[11px] font-semibold text-brand-slate mb-1">
                  Evaluation Factors:
                </p>
                <ul className="space-y-1 text-[11px] text-brand-ink">
                  {reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-brand-gold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
