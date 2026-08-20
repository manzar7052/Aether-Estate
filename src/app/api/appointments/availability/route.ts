import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/services/appointments";
import { requireApiStaff } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";

export async function GET(request: Request) {
  try {
    await requireApiStaff();

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const date = searchParams.get("date");
    const durationStr = searchParams.get("duration");
    const excludeAppointmentId = searchParams.get("excludeAppointmentId") || undefined;
    const duration = durationStr ? parseInt(durationStr, 10) : undefined;

    if (!agentId || !date) {
      return NextResponse.json(
        { error: "agentId and date query parameters are required." },
        { status: 400 },
      );
    }

    const result = await getAvailableSlots(
      agentId,
      date,
      duration,
      excludeAppointmentId,
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }

    console.error("[GET /api/appointments/availability] Error:", err);
    return NextResponse.json(
      { error: "Unable to load availability." },
      { status: 500 },
    );
  }
}
