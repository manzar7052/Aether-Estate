import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";
import type { Lead, LeadStatus, QualificationCategory } from "@/types/database";

export interface CRMLeadsQueryParams {
  search?: string;
  status?: LeadStatus | "all";
  qualification?: QualificationCategory | "all";
  assignedAgentId?: string; // 'all' | 'unassigned' | agent UUID (Admin only)
  minBudget?: number;
  from?: string;
  to?: string;
  sort?:
    | "newest"
    | "oldest"
    | "budget_desc"
    | "budget_asc"
    | "score_desc"
    | "name_asc";
  page?: number;
  pageSize?: number;
}

export interface CRMLeadsQueryResult {
  leads: Lead[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CRMSummaryMetrics {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  hotLeads: number;
  unassignedLeads?: number;
}

const ALLOWED_STATUSES: Set<string> = new Set([
  "new",
  "qualifying",
  "qualified",
  "nurturing",
  "appointment_set",
  "closed",
  "lost",
]);

/**
 * Server-side paginated and filtered lead query engine for the CRM dashboard.
 * Enforces strict multi-agent authorization boundaries (Admin vs Agent).
 */
export async function getCRMLeads(
  params: CRMLeadsQueryParams = {},
): Promise<CRMLeadsQueryResult> {
  // 1. Authorize staff caller identity and role
  const { profile } = await requireStaff();

  const supabase = await createServerSupabaseClient();
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceRoleClient()
    : supabase;

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
  const fromIndex = (page - 1) * pageSize;
  const toIndex = fromIndex + pageSize - 1;

  let query = supabase.from("leads").select("*", { count: "exact" });

  // 2. Multi-Agent Scoping
  if (profile.role === "agent") {
    // AGENT: Restricted strictly to leads assigned to the currently authenticated agent
    query = query.eq("assigned_agent_id", profile.id);
  } else if (profile.role === "admin") {
    // ADMIN: Can optionally filter by assigned agent or unassigned leads
    if (params.assignedAgentId === "unassigned") {
      query = query.is("assigned_agent_id", null);
    } else if (
      params.assignedAgentId &&
      params.assignedAgentId !== "all" &&
      params.assignedAgentId.trim() !== ""
    ) {
      query = query.eq("assigned_agent_id", params.assignedAgentId);
    }
  }

  // 3. Status Filter
  if (params.status && params.status !== "all") {
    if (ALLOWED_STATUSES.has(params.status)) {
      query = query.eq("status", params.status);
    }
  }

  // 4. Qualification Filter (Maps hot >= 80, warm 50..79, cold < 50)
  if (params.qualification && params.qualification !== "all") {
    if (params.qualification === "hot") {
      query = query.gte("lead_score", 80);
    } else if (params.qualification === "warm") {
      query = query.gte("lead_score", 50).lt("lead_score", 80);
    } else if (params.qualification === "cold") {
      query = query.or("lead_score.lt.50,lead_score.is.null");
    }
  }

  // 5. Minimum Budget Filter
  if (typeof params.minBudget === "number" && params.minBudget > 0) {
    query = query.gte("budget_max", params.minBudget);
  }

  // 6. Date Range Filters (created_at)
  if (params.from && !isNaN(Date.parse(params.from))) {
    query = query.gte("created_at", new Date(params.from).toISOString());
  }
  if (params.to && !isNaN(Date.parse(params.to))) {
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);
    query = query.lte("created_at", toDate.toISOString());
  }

  // 7. Search Filter (name, email, phone, city)
  if (params.search && params.search.trim().length > 0) {
    const clean = params.search.trim().replace(/[%_]/g, "");
    query = query.or(
      `full_name.ilike.%${clean}%,email.ilike.%${clean}%,phone.ilike.%${clean}%,city.ilike.%${clean}%`,
    );
  }

  // 8. Sorting
  const sort = params.sort || "newest";
  switch (sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "budget_desc":
      query = query.order("budget_max", { ascending: false, nullsFirst: false });
      break;
    case "budget_asc":
      query = query.order("budget_max", { ascending: true, nullsFirst: false });
      break;
    case "score_desc":
      query = query.order("lead_score", { ascending: false, nullsFirst: false });
      break;
    case "name_asc":
      query = query.order("full_name", { ascending: true });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  // 9. Pagination Range
  query = query.range(fromIndex, toIndex);

  let { data, count, error } = await query;

  // Fallback to service role if needed
  if (error && admin) {
    let adminQuery = admin.from("leads").select("*", { count: "exact" });
    if (profile.role === "agent") {
      adminQuery = adminQuery.eq("assigned_agent_id", profile.id);
    } else if (profile.role === "admin") {
      if (params.assignedAgentId === "unassigned") {
        adminQuery = adminQuery.is("assigned_agent_id", null);
      } else if (
        params.assignedAgentId &&
        params.assignedAgentId !== "all" &&
        params.assignedAgentId.trim() !== ""
      ) {
        adminQuery = adminQuery.eq("assigned_agent_id", params.assignedAgentId);
      }
    }

    if (params.status && params.status !== "all" && ALLOWED_STATUSES.has(params.status)) {
      adminQuery = adminQuery.eq("status", params.status);
    }
    if (params.qualification && params.qualification !== "all") {
      if (params.qualification === "hot") {
        adminQuery = adminQuery.gte("lead_score", 80);
      } else if (params.qualification === "warm") {
        adminQuery = adminQuery.gte("lead_score", 50).lt("lead_score", 80);
      } else if (params.qualification === "cold") {
        adminQuery = adminQuery.or("lead_score.lt.50,lead_score.is.null");
      }
    }
    if (typeof params.minBudget === "number" && params.minBudget > 0) {
      adminQuery = adminQuery.gte("budget_max", params.minBudget);
    }
    if (params.from && !isNaN(Date.parse(params.from))) {
      adminQuery = adminQuery.gte("created_at", new Date(params.from).toISOString());
    }
    if (params.to && !isNaN(Date.parse(params.to))) {
      const toDate = new Date(params.to);
      toDate.setHours(23, 59, 59, 999);
      adminQuery = adminQuery.lte("created_at", toDate.toISOString());
    }
    if (params.search && params.search.trim().length > 0) {
      const clean = params.search.trim().replace(/[%_]/g, "");
      adminQuery = adminQuery.or(
        `full_name.ilike.%${clean}%,email.ilike.%${clean}%,phone.ilike.%${clean}%,city.ilike.%${clean}%`,
      );
    }
    adminQuery = adminQuery.order("created_at", { ascending: false }).range(fromIndex, toIndex);

    const fallbackRes = await adminQuery;
    data = fallbackRes.data;
    count = fallbackRes.count;
    error = fallbackRes.error;
  }

  if (error) {
    console.error("[getCRMLeads] Database query failed:", error.message);
    throw new AppError("DB_QUERY_FAILED", "Unable to retrieve leads at this time.", 500);
  }

  const leads = (data || []) as unknown as Lead[];
  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    leads,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Calculates live summary metric counts scoped to caller's authorization domain.
 */
export async function getCRMSummaryMetrics(): Promise<CRMSummaryMetrics> {
  const { profile } = await requireStaff();

  const supabase = await createServerSupabaseClient();
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceRoleClient()
    : supabase;

  let totalQ = supabase.from("leads").select("id", { count: "exact", head: true });
  let newQ = supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new");
  let qualQ = supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "qualified");
  let hotQ = supabase.from("leads").select("id", { count: "exact", head: true }).gte("lead_score", 80);
  const unassignedQ = supabase.from("leads").select("id", { count: "exact", head: true }).is("assigned_agent_id", null);

  // Apply Agent scoping if caller is an Agent
  if (profile.role === "agent") {
    totalQ = totalQ.eq("assigned_agent_id", profile.id);
    newQ = newQ.eq("assigned_agent_id", profile.id);
    qualQ = qualQ.eq("assigned_agent_id", profile.id);
    hotQ = hotQ.eq("assigned_agent_id", profile.id);
  }

  const [totalRes, newRes, qualRes, hotRes, unassignedRes] = await Promise.all([
    totalQ,
    newQ,
    qualQ,
    hotQ,
    profile.role === "admin" ? unassignedQ : Promise.resolve({ count: 0, error: null }),
  ]);

  if (totalRes.error && admin) {
    let aTotal = admin.from("leads").select("id", { count: "exact", head: true });
    let aNew = admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "new");
    let aQual = admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "qualified");
    let aHot = admin.from("leads").select("id", { count: "exact", head: true }).gte("lead_score", 80);
    const aUnassigned = admin.from("leads").select("id", { count: "exact", head: true }).is("assigned_agent_id", null);

    if (profile.role === "agent") {
      aTotal = aTotal.eq("assigned_agent_id", profile.id);
      aNew = aNew.eq("assigned_agent_id", profile.id);
      aQual = aQual.eq("assigned_agent_id", profile.id);
      aHot = aHot.eq("assigned_agent_id", profile.id);
    }

    const [t, n, q, h, u] = await Promise.all([
      aTotal,
      aNew,
      aQual,
      aHot,
      profile.role === "admin" ? aUnassigned : Promise.resolve({ count: 0 }),
    ]);

    return {
      totalLeads: t.count || 0,
      newLeads: n.count || 0,
      qualifiedLeads: q.count || 0,
      hotLeads: h.count || 0,
      unassignedLeads: profile.role === "admin" ? (u.count || 0) : undefined,
    };
  }

  return {
    totalLeads: totalRes.count || 0,
    newLeads: newRes.count || 0,
    qualifiedLeads: qualRes.count || 0,
    hotLeads: hotRes.count || 0,
    unassignedLeads: profile.role === "admin" ? (unassignedRes.count || 0) : undefined,
  };
}

/**
 * Fetches a single lead record with complete details for the lead modal/drawer.
 * Restricts agents strictly to their assigned leads.
 */
export async function getCRMLeadById(leadId: string): Promise<Lead> {
  const { profile } = await requireStaff();

  if (!leadId) {
    throw new AppError("INVALID_LEAD_ID", "Lead ID is required.", 400);
  }

  const supabase = await createServerSupabaseClient();
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceRoleClient()
    : supabase;

  let query = supabase.from("leads").select("*").eq("id", leadId);
  if (profile.role === "agent") {
    query = query.eq("assigned_agent_id", profile.id);
  }

  let { data, error } = await query.maybeSingle();

  if ((error || !data) && admin) {
    let adminQuery = admin.from("leads").select("*").eq("id", leadId);
    if (profile.role === "agent") {
      adminQuery = adminQuery.eq("assigned_agent_id", profile.id);
    }
    const fallback = await adminQuery.maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
  }

  return data as unknown as Lead;
}
