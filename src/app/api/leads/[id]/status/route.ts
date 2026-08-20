import { NextResponse } from "next/server";
import { z } from "zod";
import { updateLeadStatus } from "@/services/leads";
import { AppError } from "@/lib/utils/errors";
import type { LeadStatus } from "@/types/database";

const updateStatusSchema = z.object({
  status: z.enum([
    "new",
    "qualifying",
    "qualified",
    "nurturing",
    "appointment_set",
    "closed",
    "lost",
  ] as const),
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
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid status value provided.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const updatedLead = await updateLeadStatus(
      leadId,
      parsed.data.status as LeadStatus,
    );

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

    console.error("[POST /api/leads/[id]/status] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to update lead status. Please try again." },
      { status: 500 },
    );
  }
}
