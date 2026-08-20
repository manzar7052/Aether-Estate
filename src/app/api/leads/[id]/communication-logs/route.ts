import { NextResponse } from "next/server";
import { requireApiStaff } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getCommunicationLogs } from "@/services/notifications/logs";
import { AppError } from "@/lib/utils/errors";
import type { CommunicationChannel, CommunicationStatus } from "@/types/database";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const leadId = params.id;

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required." },
        { status: 400 },
      );
    }

    // 1. Authenticate caller (Staff: Admin or Agent)
    const { profile } = await requireApiStaff();

    // 2. Authorize access to parent lead
    const admin = createServiceRoleClient();
    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("id, assigned_agent_id")
      .eq("id", leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
    }

    if (profile.role === "agent" && lead.assigned_agent_id !== profile.id) {
      console.warn(
        `[Security Boundary] Agent ${profile.id} attempted accessing communication logs for unassigned Lead ${leadId}`,
      );
      throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
    }

    // 3. Parse query filters & pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const rawChannel = searchParams.get("channel") || "all";
    const rawStatus = searchParams.get("status") || "all";

    const channel =
      rawChannel === "email" || rawChannel === "whatsapp"
        ? (rawChannel as CommunicationChannel)
        : "all";

    const status =
      rawStatus === "sent" ||
      rawStatus === "skipped" ||
      rawStatus === "failed" ||
      rawStatus === "pending"
        ? (rawStatus as CommunicationStatus)
        : "all";

    const result = await getCommunicationLogs(leadId, {
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
      channel,
      status,
    });

    return NextResponse.json({
      success: true,
      logs: result.data,
      pagination: result.pagination,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }

    console.error("[GET /api/leads/[id]/communication-logs] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to load communication logs." },
      { status: 500 },
    );
  }
}
