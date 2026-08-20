import { NextResponse } from "next/server";
import { rescheduleAppointment } from "@/services/appointments";
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

    const body = await request.json();
    const updated = await rescheduleAppointment(appointmentId, body);

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

    console.error("[PATCH /api/appointments/[id]/reschedule] Error:", err);
    return NextResponse.json(
      { error: "Unable to reschedule appointment." },
      { status: 500 },
    );
  }
}
