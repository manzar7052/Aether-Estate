import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { getCRMSummaryMetrics } from "@/services/leads";
import { Card } from "@/components/ui/card";
import { CRMMetrics } from "@/components/crm/crm-metrics";

export default async function DashboardPage() {
  const { profile } = await requireStaff();
  const metrics = await getCRMSummaryMetrics();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-line pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-brand-ink">
            Welcome, {profile.full_name}
          </h1>
          <p className="mt-1 text-sm text-brand-slate">
            Aether Estates Staff Portal · Overview & Performance
          </p>
        </div>
        <Link
          href="/dashboard/leads"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-ink px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-black transition"
        >
          <span>Open Leads CRM</span>
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
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </Link>
      </div>

      {/* Summary Metrics */}
      <CRMMetrics metrics={metrics} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-brand-ink">
              Leads & Pipeline Management
            </h2>
            <span className="rounded-full bg-brand-sand px-2.5 py-1 text-[11px] font-semibold text-brand-gold">
              Phase 4B Active
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-brand-slate">
            Access the CRM pipeline at{" "}
            <Link
              href="/dashboard/leads"
              className="font-semibold text-brand-gold hover:underline"
            >
              /dashboard/leads
            </Link>{" "}
            to filter incoming prospects, manage workflow stages (New, Contacted,
            Qualified, Nurture, Closed), and inspect deterministic qualification
            breakdown scores.
          </p>
          <div className="mt-5">
            <Link
              href="/dashboard/leads"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-gold hover:underline"
            >
              <span>View Kanban & Table Pipeline</span>
              <span>→</span>
            </Link>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-slate">
            Staff Profile Details
          </h2>
          <dl className="space-y-2.5 text-sm divide-y divide-brand-line/60">
            <div className="flex justify-between pt-1">
              <dt className="text-brand-slate">Full Name</dt>
              <dd className="font-semibold text-brand-ink">{profile.full_name}</dd>
            </div>
            <div className="flex justify-between pt-2.5">
              <dt className="text-brand-slate">Email Address</dt>
              <dd className="font-medium text-brand-ink">{profile.email}</dd>
            </div>
            <div className="flex justify-between pt-2.5">
              <dt className="text-brand-slate">Assigned Role</dt>
              <dd className="capitalize font-bold text-brand-gold">
                {profile.role}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
