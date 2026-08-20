"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import type { AgentSummary } from "@/services/agents";
import type { UserRole } from "@/types/database";

interface CRMFiltersProps {
  currentStatus?: string;
  currentQualification?: string;
  currentAssignedAgentId?: string;
  currentMinBudget?: string;
  currentFrom?: string;
  currentTo?: string;
  currentSearch?: string;
  currentSort?: string;
  agents?: AgentSummary[];
  currentUserRole?: UserRole;
}

export function CRMFilters({
  currentStatus = "all",
  currentQualification = "all",
  currentAssignedAgentId = "all",
  currentMinBudget = "",
  currentFrom = "",
  currentTo = "",
  currentSearch = "",
  currentSort = "newest",
  agents = [],
  currentUserRole = "agent",
}: CRMFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(currentSearch);
  const [minBudget, setMinBudget] = useState(currentMinBudget);
  const [from, setFrom] = useState(currentFrom);
  const [to, setTo] = useState(currentTo);

  function applyFilters(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams?.toString() || "");

    // Reset to page 1 on filter change
    params.set("page", "1");

    Object.entries(updates).forEach(([key, val]) => {
      if (val === undefined || val === "" || val === "all") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    applyFilters({
      search: search.trim() || undefined,
      minBudget: minBudget || undefined,
      from: from || undefined,
      to: to || undefined,
    });
  }

  function clearFilters() {
    setSearch("");
    setMinBudget("");
    setFrom("");
    setTo("");
    const params = new URLSearchParams();
    // Preserve view
    const view = searchParams?.get("view");
    if (view) params.set("view", view);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasActiveFilters = Boolean(
    (currentStatus && currentStatus !== "all") ||
      (currentQualification && currentQualification !== "all") ||
      (currentAssignedAgentId && currentAssignedAgentId !== "all") ||
      currentMinBudget ||
      currentFrom ||
      currentTo ||
      currentSearch,
  );

  return (
    <div className="rounded-2xl border border-brand-line bg-white p-4 sm:p-5 shadow-sm mb-6">
      {/* Agent Scope Notice */}
      {currentUserRole === "agent" && (
        <div className="mb-3.5 flex items-center gap-2 rounded-xl bg-brand-sand/40 px-3.5 py-2 text-xs text-brand-ink">
          <svg className="h-4 w-4 text-brand-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Showing leads assigned to your account.</span>
        </div>
      )}

      <form onSubmit={handleSearchSubmit} className="space-y-4">
        {/* Row 1: Search, Status, Agent (Admin only) & Sorting */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          {/* Search bar */}
          <div className={currentUserRole === "admin" ? "sm:col-span-4 relative" : "sm:col-span-6 relative"}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, or location..."
              className="w-full rounded-xl border border-brand-line bg-brand-cream/40 px-4 py-2.5 pl-10 text-sm text-brand-ink placeholder:text-brand-slate/70 focus:border-brand-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-gold transition"
            />
            <svg
              className="absolute left-3.5 top-3 h-4 w-4 text-brand-slate"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Admin Agent Filter */}
          {currentUserRole === "admin" && (
            <div className="sm:col-span-3">
              <select
                value={currentAssignedAgentId}
                onChange={(e) => applyFilters({ assignedAgentId: e.target.value })}
                className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5 text-sm text-brand-ink focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
              >
                <option value="all">All Assigned & Unassigned</option>
                <option value="unassigned">Unassigned Leads</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    Agent: {agent.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Dropdown */}
          <div className={currentUserRole === "admin" ? "sm:col-span-3" : "sm:col-span-3"}>
            <select
              value={currentStatus}
              onChange={(e) => applyFilters({ status: e.target.value })}
              className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5 text-sm text-brand-ink focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="qualifying">Qualifying</option>
              <option value="qualified">Qualified</option>
              <option value="nurturing">Nurture</option>
              <option value="appointment_set">Appointment Set</option>
              <option value="closed">Closed</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className={currentUserRole === "admin" ? "sm:col-span-2" : "sm:col-span-3"}>
            <select
              value={currentSort}
              onChange={(e) => applyFilters({ sort: e.target.value })}
              className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5 text-sm text-brand-ink focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="score_desc">Score ↓</option>
              <option value="budget_desc">Budget ↓</option>
              <option value="budget_asc">Budget ↑</option>
              <option value="name_asc">Name (A–Z)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Qualification pills & Date Range & Min Budget */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-line/70 pt-3">
          {/* Qualification Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-xs font-semibold text-brand-slate mr-1">
              Category:
            </span>
            {(["all", "hot", "warm", "cold"] as const).map((cat) => {
              const active = (currentQualification || "all") === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => applyFilters({ qualification: cat })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition ${
                    active
                      ? "bg-brand-ink text-white shadow-sm"
                      : "bg-brand-sand/60 text-brand-slate hover:bg-brand-sand hover:text-brand-ink"
                  }`}
                >
                  {cat === "all" ? "All Leads" : cat}
                </button>
              );
            })}
          </div>

          {/* Budget and Date Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-brand-slate">Min $:</span>
              <input
                type="number"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                placeholder="500000"
                className="w-24 rounded-lg border border-brand-line px-2 py-1 text-xs text-brand-ink focus:border-brand-gold focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-brand-slate">From:</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-brand-line px-2 py-1 text-xs text-brand-ink focus:border-brand-gold focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-brand-slate">To:</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-brand-line px-2 py-1 text-xs text-brand-ink focus:border-brand-gold focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand-gold px-3 py-1 text-xs font-semibold text-brand-ink shadow-sm hover:brightness-105 transition disabled:opacity-50"
            >
              {isPending ? "Filtering..." : "Apply"}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-brand-slate hover:text-rose-600 transition underline underline-offset-2 ml-1"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
