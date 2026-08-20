import { NextResponse } from "next/server";
import { getLeadTranscript } from "@/services/leads";
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

    const transcript = await getLeadTranscript(leadId);

    return NextResponse.json({
      success: true,
      transcript,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }

    console.error("[GET /api/leads/[id]/transcript] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to load conversation transcript." },
      { status: 500 },
    );
  }
}
