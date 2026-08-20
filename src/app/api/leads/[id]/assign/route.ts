import { NextResponse } from "next/server";
import { z } from "zod";
import { assignLead } from "@/services/leads";
import { AppError } from "@/lib/utils/errors";

const assignLeadSchema = z.object({
  agentId: z.string().uuid("Invalid Agent ID format.").nullable(),
});

export async function POST(
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

    const body = await request.json();
    const parsed = assignLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid assignment payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const updatedLead = await assignLead(leadId, parsed.data.agentId);

    return NextResponse.json({
      success: true,
      lead: updatedLead,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }

    console.error("[POST /api/leads/[id]/assign] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to assign lead." },
      { status: 500 },
    );
  }
}
