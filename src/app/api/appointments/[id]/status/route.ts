import { NextResponse } from "next/server";
import {
  updateAppointmentStatus,
  updateAppointmentStatusSchema,
} from "@/services/appointments";
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
    const parsed = updateAppointmentStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid status value provided.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const updated = await updateAppointmentStatus(
      appointmentId,
      parsed.data.status,
    );

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

    console.error("[PATCH /api/appointments/[id]/status] Error:", err);
    return NextResponse.json(
      { error: "Unable to update appointment status." },
      { status: 500 },
    );
  }
}
