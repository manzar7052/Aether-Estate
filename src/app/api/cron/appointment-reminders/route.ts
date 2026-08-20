import { NextRequest, NextResponse } from "next/server";
import { processDueAppointmentReminders } from "@/services/appointments/reminders";
import { getCurrentProfile } from "@/lib/auth/session";

/**
 * Validates whether the incoming request is authorized to execute reminder cron processing.
 * Accepts:
 * 1. Bearer token matching CRON_SECRET or process.env.CRON_SECRET
 * 2. Header `x-cron-secret` matching CRON_SECRET
 * 3. Authenticated Admin staff session
 */
async function isCronAuthorized(req: NextRequest): Promise<boolean> {
  const cronSecret =
    process.env.CRON_SECRET ||
    (process.env.NODE_ENV !== "production" ? "dev_cron_secret" : undefined);
  const authHeader = req.headers.get("authorization");
  const xCronSecret = req.headers.get("x-cron-secret");

  // 1. Secret match
  if (cronSecret) {
    if (authHeader && authHeader === `Bearer ${cronSecret}`) {
      return true;
    }
    if (xCronSecret && xCronSecret === cronSecret) {
      return true;
    }
  }

  // 2. Fallback: Authenticated staff admin session
  try {
    const session = await getCurrentProfile();
    if (session && session.profile.role === "admin") {
      return true;
    }
  } catch {
    // Ignore auth session error
  }

  return false;
}

export async function POST(req: NextRequest) {
  const authorized = await isCronAuthorized(req);
  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized. Valid CRON_SECRET or Admin session required." },
      { status: 401 },
    );
  }

  try {
    let batchSize = 50;
    try {
      const body = await req.json();
      if (typeof body?.batchSize === "number" && body.batchSize > 0) {
        batchSize = Math.min(body.batchSize, 100);
      }
    } catch {
      // Body not provided or not JSON
    }

    const results = await processDueAppointmentReminders({ batchSize });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/cron/appointment-reminders] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const authorized = await isCronAuthorized(req);
  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized. Valid CRON_SECRET or Admin session required." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const batchParam = searchParams.get("batchSize");
  const batchSize = batchParam ? parseInt(batchParam, 10) || 50 : 50;

  try {
    const results = await processDueAppointmentReminders({ batchSize });
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/cron/appointment-reminders] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
