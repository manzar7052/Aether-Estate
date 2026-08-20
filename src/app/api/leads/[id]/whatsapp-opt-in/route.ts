import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { setLeadWhatsAppConsent } from "@/services/notifications/whatsapp/consent";
import { AppError } from "@/lib/utils/errors";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: leadId } = await context.params;
    const body = await req.json();

    if (typeof body.optIn !== "boolean") {
      return NextResponse.json(
        { error: "Field 'optIn' must be a boolean." },
        { status: 400 },
      );
    }

    const admin = createServiceRoleClient();

    // 1. Verify lead exists
    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return NextResponse.json(
        { error: "Lead not found." },
        { status: 404 },
      );
    }

    // 2. Authorization Check
    // A: Authenticated staff session (Admin can access all; Agent can access assigned lead)
    const session = await getCurrentProfile();
    let isAuthorized = false;

    if (session) {
      if (
        session.profile.role === "admin" ||
        (session.profile.role === "agent" && lead.assigned_agent_id === session.profile.id)
      ) {
        isAuthorized = true;
      }
    }

    // B: Public conversation access token authorization (for prospect self-service opt-in)
    if (!isAuthorized) {
      const accessToken =
        req.headers.get("x-access-token") ||
        new URL(req.url).searchParams.get("accessToken") ||
        body.accessToken;

      if (accessToken) {
        const { data: conv } = await admin
          .from("lead_conversations")
          .select("id")
          .eq("lead_id", leadId)
          .eq("access_token", accessToken)
          .maybeSingle();

        if (conv) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized to update WhatsApp consent for this lead." },
        { status: 403 },
      );
    }

    // 3. Update Consent
    const result = await setLeadWhatsAppConsent(leadId, body.optIn);

    return NextResponse.json({
      success: true,
      leadId,
      optIn: result.optIn,
      updatedAt: result.updatedAt,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
