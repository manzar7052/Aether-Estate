import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeLeadWithAI } from "@/services/ai/qualification";
import { AppError } from "@/lib/utils/errors";

const aiQualificationRequestSchema = z
  .object({
    applySuggestions: z.boolean().optional().default(false),
  })
  .optional();

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

    let applySuggestions = false;
    try {
      const body = await request.json();
      const parsed = aiQualificationRequestSchema.safeParse(body);
      if (parsed.success && parsed.data) {
        applySuggestions = parsed.data.applySuggestions;
      }
    } catch {
      // Body is optional
    }

    const result = await analyzeLeadWithAI(leadId, { applySuggestions });

    return NextResponse.json({
      success: true,
      lead: result.lead,
      signals: result.signals,
      conflicts: result.conflicts,
      suggestedEnrichments: result.suggestedEnrichments,
      model: result.model,
      durationMs: result.durationMs,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }

    console.error(
      "[POST /api/leads/[id]/ai-qualification] Unexpected error:",
      err,
    );
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "AI qualification analysis failed. Existing qualification score remains unchanged.",
      },
      { status: 500 },
    );
  }
}
