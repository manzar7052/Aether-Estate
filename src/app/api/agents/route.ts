import { NextResponse } from "next/server";
import { listAssignableAgents } from "@/services/agents";
import { AppError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const agents = await listAssignableAgents();
    return NextResponse.json({
      success: true,
      agents,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }

    console.error("[GET /api/agents] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve agent roster." },
      { status: 500 },
    );
  }
}
