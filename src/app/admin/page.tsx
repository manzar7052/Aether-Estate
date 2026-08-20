import { requireAdmin } from "@/lib/auth/session";
import { getCRMLeads, getCRMSummaryMetrics } from "@/services/leads";
import { listAssignableAgents, type AgentSummary } from "@/services/agents";
import { AdminClient } from "@/components/admin/admin-client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Portal | Aether Estates",
  description: "Executive administrative oversight, lead pipeline stream, and system management.",
};

export default async function AdminPage() {
  const { profile } = await requireAdmin();

  let agents: AgentSummary[] = [];
  try {
    agents = await listAssignableAgents();
  } catch {
    // Graceful fallback
  }

  const [leadsResult, metrics] = await Promise.all([
    getCRMLeads({ pageSize: 12, sort: "newest" }).catch(() => ({
      leads: [],
      totalCount: 0,
      page: 1,
      pageSize: 12,
      totalPages: 0,
    })),
    getCRMSummaryMetrics().catch(() => ({
      totalLeads: 0,
      newLeads: 0,
      qualifiedLeads: 0,
      hotLeads: 0,
    })),
  ]);

  return (
    <AdminClient
      initialLeads={leadsResult.leads}
      totalCount={leadsResult.totalCount}
      metrics={metrics}
      currentProfile={profile}
      agents={agents}
    />
  );
}
