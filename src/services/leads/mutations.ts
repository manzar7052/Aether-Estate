import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireApiStaff, requireApiAdmin } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";
import type { Lead, LeadStatus } from "@/types/database";

export const CRM_LEAD_STATUSES: { status: LeadStatus; label: string }[] = [
  { status: "new", label: "New" },
  { status: "qualifying", label: "Qualifying" },
  { status: "qualified", label: "Qualified" },
  { status: "nurturing", label: "Nurture" },
  { status: "appointment_set", label: "Appointment Set" },
  { status: "closed", label: "Closed" },
  { status: "lost", label: "Lost" },
];

const VALID_STATUSES: Set<string> = new Set(
  CRM_LEAD_STATUSES.map((s) => s.status),
);

/**
 * Updates a lead's workflow status.
 * Enforces staff authentication, multi-agent assignment scoping, and status allowlisting.
 */
export async function updateLeadStatus(
  leadId: string,
  newStatus: LeadStatus,
): Promise<Lead> {
  // 1. Authorize staff
  const { profile } = await requireApiStaff();

  if (!leadId) {
    throw new AppError("INVALID_LEAD_ID", "Lead ID is required.", 400);
  }

  if (!VALID_STATUSES.has(newStatus)) {
    throw new AppError(
      "INVALID_STATUS",
      `'${newStatus}' is not a valid lead status.`,
      400,
    );
  }

  const supabase = await createServerSupabaseClient();
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceRoleClient()
    : supabase;

  // 2. Fetch existing lead and check ownership
  let { data: existingLead, error: leadErr } = await supabase
    .from("leads")
    .select("id, assigned_agent_id")
    .eq("id", leadId)
    .maybeSingle();

  if ((leadErr || !existingLead) && admin) {
    const fb = await admin
      .from("leads")
      .select("id, assigned_agent_id")
      .eq("id", leadId)
      .maybeSingle();
    existingLead = fb.data;
    leadErr = fb.error;
  }

  if (leadErr || !existingLead) {
    throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
  }

  // 3. Multi-Agent Authorization Boundary
  if (profile.role === "agent" && existingLead.assigned_agent_id !== profile.id) {
    console.warn(
      `[Security] Agent ${profile.id} attempted to modify status for unassigned lead ${leadId}`,
    );
    throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
  }

  const updatedAt = new Date().toISOString();

  let { data, error } = await supabase
    .from("leads")
    .update({
      status: newStatus,
      updated_at: updatedAt,
    })
    .eq("id", leadId)
    .select("*")
    .maybeSingle();

  // Fallback to service role if needed
  if ((error || !data) && admin) {
    const fallback = await admin
      .from("leads")
      .update({
        status: newStatus,
        updated_at: updatedAt,
      })
      .eq("id", leadId)
      .select("*")
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    console.error(`[updateLeadStatus] Failed to update lead ${leadId}:`, error?.message);
    throw new AppError("STATUS_UPDATE_FAILED", "Unable to update lead status.", 500);
  }

  console.log(
    `[CRM Status Update] Lead ${leadId} transition -> ${newStatus.toUpperCase()} by ${profile.role} (${profile.email})`,
  );

  return data as unknown as Lead;
}

/**
 * Assigns or reassigns a lead to a licensed agent, or unassigns it.
 * Strictly restricted to administrators.
 */
export async function assignLead(
  leadId: string,
  agentId: string | null,
): Promise<Lead> {
  // 1. Authorize administrator
  const { profile } = await requireApiAdmin();

  if (!leadId) {
    throw new AppError("INVALID_LEAD_ID", "Lead ID is required.", 400);
  }

  const supabase = await createServerSupabaseClient();
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceRoleClient()
    : supabase;

  // 2. If assigning to an agent, verify agent exists and has role 'agent'
  if (agentId !== null) {
    let { data: targetAgent, error: agentErr } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", agentId)
      .maybeSingle();

    if ((agentErr || !targetAgent) && admin) {
      const fbAgent = await admin
        .from("profiles")
        .select("id, role, full_name")
        .eq("id", agentId)
        .maybeSingle();
      targetAgent = fbAgent.data;
      agentErr = fbAgent.error;
    }

    if (agentErr || !targetAgent || targetAgent.role !== "agent") {
      throw new AppError(
        "INVALID_AGENT",
        "Target agent does not exist or is not a licensed agent account.",
        400,
      );
    }
  }

  const updatedAt = new Date().toISOString();

  // 3. Update assigned_agent_id on lead
  let { data, error } = await supabase
    .from("leads")
    .update({
      assigned_agent_id: agentId,
      updated_at: updatedAt,
    })
    .eq("id", leadId)
    .select("*")
    .maybeSingle();

  if ((error || !data) && admin) {
    const fb = await admin
      .from("leads")
      .update({
        assigned_agent_id: agentId,
        updated_at: updatedAt,
      })
      .eq("id", leadId)
      .select("*")
      .maybeSingle();
    data = fb.data;
    error = fb.error;
  }

  if (error || !data) {
    console.error(`[assignLead] Failed assigning lead ${leadId}:`, error?.message);
    throw new AppError("ASSIGNMENT_FAILED", "Unable to assign lead.", 500);
  }

  console.log(
    `[Lead Assignment] Lead ${leadId} assigned to ${agentId ? agentId : "UNASSIGNED"} by Admin ${profile.email}`,
  );

  return data as unknown as Lead;
}

/**
 * Unassigns a lead, returning it to the unassigned triage pool.
 */
export async function unassignLead(leadId: string): Promise<Lead> {
  return assignLead(leadId, null);
}
