"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface CRMHeaderProps {
  currentView: "kanban" | "table";
}

export function CRMHeader({ currentView }: CRMHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function switchView(view: "kanban" | "table") {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("view", view);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-line/70 pb-6 mb-6">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-brand-ink">
          Leads CRM
        </h1>
        <p className="mt-1 text-sm text-brand-slate">
          Manage, qualify, and track incoming buyer prospects and property inquiries.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Refresh button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="rounded-xl border border-brand-line bg-white p-2 text-brand-slate shadow-sm hover:bg-brand-sand hover:text-brand-ink transition disabled:opacity-50"
          title="Refresh lead data"
        >
          <svg
            className={`h-4 w-4 ${isPending ? "animate-spin text-brand-gold" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        {/* View Switcher: Kanban vs Table */}
        <div className="inline-flex rounded-xl border border-brand-line bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => switchView("kanban")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              currentView === "kanban"
                ? "bg-brand-ink text-white shadow-sm"
                : "text-brand-slate hover:text-brand-ink"
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
            <span>Kanban</span>
          </button>

          <button
            type="button"
            onClick={() => switchView("table")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              currentView === "table"
                ? "bg-brand-ink text-white shadow-sm"
                : "text-brand-slate hover:text-brand-ink"
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <span>Table</span>
          </button>
        </div>
      </div>
    </div>
  );
}
