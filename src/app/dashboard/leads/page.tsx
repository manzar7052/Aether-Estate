import { requireStaff } from "@/lib/auth/session";
import { getCRMLeads, getCRMSummaryMetrics } from "@/services/leads";
import { listAssignableAgents, type AgentSummary } from "@/services/agents";
import { CRMClient } from "@/components/crm/crm-client";
import type { LeadStatus, QualificationCategory } from "@/types/database";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads CRM | Aether Estates",
  description:
    "Manage, qualify, and track prospective luxury real-estate buyers and inquiries.",
};

interface CRMPageProps {
  searchParams: Promise<{
    status?: string;
    qualification?: string;
    assignedAgentId?: string;
    minBudget?: string;
    from?: string;
    to?: string;
    search?: string;
    sort?:
      | "newest"
      | "oldest"
      | "budget_desc"
      | "budget_asc"
      | "score_desc"
      | "name_asc";
    page?: string;
    pageSize?: string;
    view?: "kanban" | "table";
  }>;
}

export default async function LeadsCRMPage(props: CRMPageProps) {
  // 1. Authorize staff caller identity and role
  const { profile } = await requireStaff();

  const searchParams = (await props.searchParams) ?? {};

  // 2. Fetch assignable agents list for admin selectors
  let agents: AgentSummary[] = [];
  if (profile.role === "admin") {
    try {
      agents = await listAssignableAgents();
    } catch {
      // Graceful fallback
    }
  }

  // 3. Fetch leads with server-side query filters and multi-agent scoping
  const [leadsData, metrics] = await Promise.all([
    getCRMLeads({
      status: searchParams.status as LeadStatus | "all" | undefined,
      qualification: searchParams.qualification as
        | QualificationCategory
        | "all"
        | undefined,
      assignedAgentId: searchParams.assignedAgentId,
      minBudget: searchParams.minBudget
        ? Number(searchParams.minBudget)
        : undefined,
      from: searchParams.from,
      to: searchParams.to,
      search: searchParams.search,
      sort: searchParams.sort,
      page: searchParams.page ? Number(searchParams.page) : 1,
      pageSize: searchParams.pageSize ? Number(searchParams.pageSize) : 20,
    }).catch((err) => {
      console.error("[LeadsCRMPage] Failed getCRMLeads:", err);
      return {
        leads: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };
    }),
    getCRMSummaryMetrics().catch((err) => {
      console.error("[LeadsCRMPage] Failed getCRMSummaryMetrics:", err);
      return {
        totalLeads: 0,
        newLeads: 0,
        qualifiedLeads: 0,
        hotLeads: 0,
      };
    }),
  ]);

  return (
    <CRMClient
      initialData={leadsData}
      metrics={metrics}
      currentProfile={profile}
      agents={agents}
      searchParams={searchParams}
    />
  );
}
