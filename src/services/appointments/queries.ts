import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireApiStaff } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";
import type { Appointment, Property } from "@/types/database";
import type {
  AppointmentWithDetails,
  CalendarAppointmentsQueryParams,
  CalendarAppointmentsResult,
} from "./types";

/**
 * Normalizes raw appointment row with fallback values.
 */
function normalizeAppointment(raw: Record<string, unknown>): Appointment {
  return {
    ...raw,
    duration_minutes: (raw.duration_minutes as number) ?? 30,
    type: (raw.type as Appointment["type"]) ?? "consultation",
  } as Appointment;
}

/**
 * Fetches a single appointment by ID, scoped by authorization.
 * Admins can access any appointment; Agents only their own.
 */
export async function getAppointmentById(
  appointmentId: string,
): Promise<Appointment> {
  const { profile } = await requireApiStaff();

  if (!appointmentId) {
    throw new AppError("INVALID_ID", "Appointment ID is required.", 400);
  }

  const admin = createServiceRoleClient();

  const { data, error } = await admin
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !data) {
    throw new AppError("APPOINTMENT_NOT_FOUND", "Appointment not found.", 404);
  }

  // Agent authorization: can only access their own appointments
  if (profile.role === "agent" && data.agent_id !== profile.id) {
    throw new AppError("APPOINTMENT_NOT_FOUND", "Appointment not found.", 404);
  }

  return normalizeAppointment(data as Record<string, unknown>);
}

/**
 * Fetches full detailed appointment by ID with joined lead, agent, and property context.
 * Enforces strict multi-agent authorization (Agent can only view their own; returns 404).
 */
export async function getAppointmentDetailById(
  appointmentId: string,
): Promise<AppointmentWithDetails> {
  const { profile } = await requireApiStaff();

  if (!appointmentId) {
    throw new AppError("INVALID_ID", "Appointment ID is required.", 400);
  }

  const admin = createServiceRoleClient();

  // 1. Fetch appointment
  const { data: rawAppt, error: apptErr } = await admin
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();

  if (apptErr || !rawAppt) {
    throw new AppError("APPOINTMENT_NOT_FOUND", "Appointment not found.", 404);
  }

  // 2. Multi-Agent Scoping Boundary
  if (profile.role === "agent" && rawAppt.agent_id !== profile.id) {
    throw new AppError("APPOINTMENT_NOT_FOUND", "Appointment not found.", 404);
  }

  const appt = normalizeAppointment(rawAppt as Record<string, unknown>);

  // 3. Fetch lead details
  const { data: lead } = await admin
    .from("leads")
    .select(
      "id, full_name, email, phone, status, lead_score, qualification_category, source, city, property_type, budget_min, budget_max, property_id",
    )
    .eq("id", appt.lead_id)
    .maybeSingle();

  // 4. Fetch agent details
  const { data: agent } = await admin
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", appt.agent_id)
    .maybeSingle();

  // 5. Fetch property if associated
  let property: { id: string; title: string; city: string; price: number } | null = null;
  if (lead?.property_id) {
    const { data: propData } = await admin
      .from("properties")
      .select("id, title, city, price")
      .eq("id", lead.property_id)
      .maybeSingle();
    if (propData) {
      property = propData;
    }
  }

  return {
    ...appt,
    lead: lead || null,
    agent: agent || null,
    property,
  };
}

/**
 * Queries appointments for calendar and list views.
 *
 * Scoping:
 * - Agent: Automatically restricted to agent_id = profile.id.
 * - Admin: Global by default, optionally filtered by agentId.
 *
 * Filters:
 * - from (gte scheduled_at), to (lte scheduled_at), status, sort, pagination.
 */
export async function getAppointmentsForCalendar(
  params: CalendarAppointmentsQueryParams = {},
): Promise<CalendarAppointmentsResult> {
  const { profile } = await requireApiStaff();

  const supabase = await createServerSupabaseClient();
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceRoleClient()
    : supabase;

  // 1. Determine effective agent scoping
  const effectiveAgentId =
    profile.role === "agent" ? profile.id : params.agentId || undefined;

  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize || 50));
  const fromIndex = (page - 1) * pageSize;
  const toIndex = fromIndex + pageSize - 1;

  // 2. Build count query
  let countQuery = admin
    .from("appointments")
    .select("*", { count: "exact", head: true });

  if (effectiveAgentId) {
    countQuery = countQuery.eq("agent_id", effectiveAgentId);
  }
  if (params.status) {
    countQuery = countQuery.eq("status", params.status);
  }
  if (params.from) {
    countQuery = countQuery.gte("scheduled_at", params.from);
  }
  if (params.to) {
    countQuery = countQuery.lte("scheduled_at", params.to);
  }

  const { count, error: countErr } = await countQuery;

  if (countErr) {
    console.error("[getAppointmentsForCalendar] Count error:", countErr.message);
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // 3. Build data query
  let dataQuery = admin.from("appointments").select("*");

  if (effectiveAgentId) {
    dataQuery = dataQuery.eq("agent_id", effectiveAgentId);
  }
  if (params.status) {
    dataQuery = dataQuery.eq("status", params.status);
  }
  if (params.from) {
    dataQuery = dataQuery.gte("scheduled_at", params.from);
  }
  if (params.to) {
    dataQuery = dataQuery.lte("scheduled_at", params.to);
  }

  // 4. Apply sorting
  const sort = params.sort || "soonest";
  if (sort === "soonest") {
    dataQuery = dataQuery.order("scheduled_at", { ascending: true });
  } else if (sort === "latest") {
    dataQuery = dataQuery.order("scheduled_at", { ascending: false });
  } else if (sort === "newest") {
    dataQuery = dataQuery.order("created_at", { ascending: false });
  }

  // 5. Apply pagination range
  dataQuery = dataQuery.range(fromIndex, toIndex);

  const { data: rawAppointments, error: dataErr } = await dataQuery;

  if (dataErr) {
    console.error(
      "[getAppointmentsForCalendar] Data query error:",
      dataErr.message,
    );
    throw new AppError(
      "QUERY_FAILED",
      "Unable to load appointments.",
      500,
    );
  }

  const baseAppointments = (rawAppointments || []).map((a) =>
    normalizeAppointment(a as Record<string, unknown>),
  );

  // 6. Enrich with lead, agent, and property data efficiently
  if (baseAppointments.length === 0) {
    return {
      appointments: [],
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  }

  const leadIds = Array.from(new Set(baseAppointments.map((a) => a.lead_id)));
  const agentIds = Array.from(new Set(baseAppointments.map((a) => a.agent_id)));

  // Batch query leads
  const { data: leadsData } = await admin
    .from("leads")
    .select(
      "id, full_name, email, phone, status, lead_score, qualification_category, source, city, property_type, budget_min, budget_max, property_id",
    )
    .in("id", leadIds);

  const leadsMap = new Map((leadsData || []).map((l) => [l.id, l]));

  // Batch query agents
  const { data: agentsData } = await admin
    .from("profiles")
    .select("id, full_name, email, role")
    .in("id", agentIds);

  const agentsMap = new Map((agentsData || []).map((ag) => [ag.id, ag]));

  // Batch query properties if needed
  const propertyIds = Array.from(
    new Set(
      (leadsData || [])
        .map((l) => l.property_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let propertiesMap = new Map<string, Property>();
  if (propertyIds.length > 0) {
    const { data: propsData } = await admin
      .from("properties")
      .select("id, title, city, price")
      .in("id", propertyIds);
    propertiesMap = new Map(
      (propsData || []).map((p) => [p.id, p as unknown as Property]),
    );
  }

  // Assemble enriched appointments
  const appointmentsWithDetails: AppointmentWithDetails[] = baseAppointments.map(
    (appt) => {
      const lead = leadsMap.get(appt.lead_id) || null;
      const agent = agentsMap.get(appt.agent_id) || null;
      const prop = lead?.property_id
        ? propertiesMap.get(lead.property_id) || null
        : null;

      return {
        ...appt,
        lead: lead || null,
        agent: agent || null,
        property: prop
          ? {
              id: prop.id,
              title: prop.title,
              city: prop.city,
              price: prop.price,
            }
          : null,
      };
    },
  );

  return {
    appointments: appointmentsWithDetails,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Fetches all appointments for a specific lead, scoped by authorization.
 */
export async function getLeadAppointments(
  leadId: string,
): Promise<Appointment[]> {
  const { profile } = await requireApiStaff();

  if (!leadId) {
    throw new AppError("INVALID_LEAD_ID", "Lead ID is required.", 400);
  }

  const admin = createServiceRoleClient();

  // Check lead access
  const { data: lead } = await admin
    .from("leads")
    .select("id, assigned_agent_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) {
    throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
  }

  // Agent can only see appointments for their assigned leads
  if (profile.role === "agent" && lead.assigned_agent_id !== profile.id) {
    throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
  }

  const { data: appointments, error } = await admin
    .from("appointments")
    .select("*")
    .eq("lead_id", leadId)
    .order("scheduled_at", { ascending: false });

  if (error) {
    console.error("[getLeadAppointments] Query error:", error.message);
    throw new AppError(
      "QUERY_FAILED",
      "Unable to load appointments.",
      500,
    );
  }

  return (appointments || []).map((a) =>
    normalizeAppointment(a as Record<string, unknown>),
  );
}

/**
 * Fetches appointments for a specific agent, optionally filtered by date range.
 */
export async function getAgentAppointments(
  agentId: string,
  options?: {
    from?: string;
    to?: string;
  },
): Promise<Appointment[]> {
  const { profile } = await requireApiStaff();

  // Agent can only query their own appointments
  if (profile.role === "agent" && agentId !== profile.id) {
    throw new AppError(
      "FORBIDDEN",
      "You can only view your own appointments.",
      403,
    );
  }

  const admin = createServiceRoleClient();

  let query = admin
    .from("appointments")
    .select("*")
    .eq("agent_id", agentId)
    .order("scheduled_at", { ascending: true });

  if (options?.from) {
    query = query.gte("scheduled_at", options.from);
  }
  if (options?.to) {
    query = query.lte("scheduled_at", options.to);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getAgentAppointments] Query error:", error.message);
    throw new AppError("QUERY_FAILED", "Unable to load appointments.", 500);
  }

  return (data || []).map((a) =>
    normalizeAppointment(a as Record<string, unknown>),
  );
}
