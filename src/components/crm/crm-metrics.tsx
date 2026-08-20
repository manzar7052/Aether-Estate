import type { CRMSummaryMetrics } from "@/services/leads";

export function CRMMetrics({ metrics }: { metrics: CRMSummaryMetrics }) {
  const cards = [
    {
      label: "Total Leads",
      value: metrics.totalLeads,
      hint: "All recorded prospects",
      icon: (
        <svg
          className="h-5 w-5 text-brand-slate"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      accent: "border-brand-line",
    },
    {
      label: "New Inquiries",
      value: metrics.newLeads,
      hint: "Awaiting first contact",
      icon: (
        <svg
          className="h-5 w-5 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      accent: "border-blue-200 bg-blue-50/40",
    },
    {
      label: "Qualified Pipeline",
      value: metrics.qualifiedLeads,
      hint: "Active verified buyers",
      icon: (
        <svg
          className="h-5 w-5 text-emerald-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      accent: "border-emerald-200 bg-emerald-50/40",
    },
    {
      label: "Hot Leads (Score ≥ 80)",
      value: metrics.hotLeads,
      hint: "Highest closing urgency",
      icon: (
        <svg
          className="h-5 w-5 text-rose-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      accent: "border-rose-200 bg-rose-50/40",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4 mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl border bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md ${card.accent}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-slate">
              {card.label}
            </span>
            <div className="rounded-xl bg-white p-2 shadow-sm border border-brand-line/60">
              {card.icon}
            </div>
          </div>
          <div className="mt-3">
            <p className="font-serif text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-brand-slate">{card.hint}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
