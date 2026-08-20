import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Lightweight production health check endpoint.
 * Returns operational status of core infrastructure without leaking secrets or internal URLs.
 */
export async function GET() {
  const startTime = Date.now();
  let dbStatus: "connected" | "unreachable" = "unreachable";

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (!error) {
      dbStatus = "connected";
    }
  } catch (err) {
    console.warn("[GET /api/health] Database ping failed:", err);
    dbStatus = "unreachable";
  }

  const aiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const emailConfigured = Boolean(process.env.RESEND_API_KEY || process.env.NODE_ENV !== "production");
  const whatsappConfigured = Boolean(
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ||
      process.env.NODE_ENV !== "production",
  );

  const isHealthy = dbStatus === "connected";
  const latencyMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      latencyMs,
      services: {
        database: dbStatus,
        ai: aiConfigured ? "configured" : "unconfigured",
        email: emailConfigured ? "configured" : "unconfigured",
        whatsapp: whatsappConfigured ? "configured" : "unconfigured",
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
