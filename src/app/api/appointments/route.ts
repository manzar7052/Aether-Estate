import { NextResponse } from "next/server";
import {
  bookAppointment,
  getLeadAppointments,
  getAppointmentsForCalendar,
  calendarAppointmentsQuerySchema,
} from "@/services/appointments";
import { requireApiStaff } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";

/**
 * POST /api/appointments — Book a new appointment.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const appointment = await bookAppointment(body);

    return NextResponse.json(
      { success: true, appointment },
      { status: 201 },
    );
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }

    console.error("[POST /api/appointments] Error:", err);
    return NextResponse.json(
      { error: "Unable to create appointment." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/appointments — List appointments for a lead OR for calendar/list workspace.
 */
export async function GET(request: Request) {
  try {
    await requireApiStaff();

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    // If specific leadId requested (e.g. from Lead Detail modal)
    if (leadId) {
      const appointments = await getLeadAppointments(leadId);
      return NextResponse.json({ appointments });
    }

    // Calendar / List view query with filters & pagination
    const parsedQuery = calendarAppointmentsQuerySchema.safeParse({
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      status: searchParams.get("status") || undefined,
      agentId: searchParams.get("agentId") || undefined,
      sort: searchParams.get("sort") || undefined,
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters.",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await getAppointmentsForCalendar(parsedQuery.data);

    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }

    console.error("[GET /api/appointments] Error:", err);
    return NextResponse.json(
      { error: "Unable to load appointments." },
      { status: 500 },
    );
  }
}
