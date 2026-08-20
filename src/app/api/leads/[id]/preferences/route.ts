import { NextResponse } from "next/server";
import { requireApiStaff } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  getCommunicationPreferences,
  updateCommunicationPreferences,
} from "@/services/notifications/logs";
import { AppError } from "@/lib/utils/errors";

export async function GET(
  _request: Request,
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

    const { profile } = await requireApiStaff();

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
      throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
    }

    const preferences = await getCommunicationPreferences(leadId);

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }

    console.error("[GET /api/leads/[id]/preferences] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to load communication preferences." },
      { status: 500 },
    );
  }
}

export async function PATCH(
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

    const { profile } = await requireApiStaff();

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
        `[Security Boundary] Agent ${profile.id} attempted updating preferences for unassigned Lead ${leadId}`,
      );
      throw new AppError("LEAD_NOT_FOUND", "Lead not found.", 404);
    }

    const body = await request.json().catch(() => ({}));
    const { whatsappOptIn, emailTransactionalOptIn } = body;

    if (
      typeof whatsappOptIn !== "boolean" &&
      typeof emailTransactionalOptIn !== "boolean"
    ) {
      return NextResponse.json(
        { error: "At least one preference field must be provided." },
        { status: 400 },
      );
    }

    const preferences = await updateCommunicationPreferences(leadId, {
      whatsappOptIn: typeof whatsappOptIn === "boolean" ? whatsappOptIn : undefined,
      emailTransactionalOptIn:
        typeof emailTransactionalOptIn === "boolean"
          ? emailTransactionalOptIn
          : undefined,
    });

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }

    console.error("[PATCH /api/leads/[id]/preferences] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to update communication preferences." },
      { status: 500 },
    );
  }
}
