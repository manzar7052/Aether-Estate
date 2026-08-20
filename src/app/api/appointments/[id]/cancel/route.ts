import { NextResponse } from "next/server";
import { cancelAppointment } from "@/services/appointments";
import { AppError } from "@/lib/utils/errors";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const appointmentId = params.id;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "Appointment ID is required." },
        { status: 400 },
      );
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is allowed for cancel
    }

    const updated = await cancelAppointment(appointmentId, body);

    return NextResponse.json({
      success: true,
      appointment: updated,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }

    console.error("[PATCH /api/appointments/[id]/cancel] Error:", err);
    return NextResponse.json(
      { error: "Unable to cancel appointment." },
      { status: 500 },
    );
  }
}
