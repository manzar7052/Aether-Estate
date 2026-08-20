import { NextResponse } from "next/server";
import { getAppointmentDetailById } from "@/services/appointments";
import { AppError } from "@/lib/utils/errors";

export async function GET(
  _request: Request,
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

    const appointment = await getAppointmentDetailById(appointmentId);

    return NextResponse.json({ appointment });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }

    console.error("[GET /api/appointments/[id]] Error:", err);
    return NextResponse.json(
      { error: "Unable to load appointment." },
      { status: 500 },
    );
  }
}
