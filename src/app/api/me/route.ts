import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth/guards";
import { logServerError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const result = await requireApiProfile();
    if (!result.ok) {
      return result.response;
    }

    const { profile } = result;
    return NextResponse.json({
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
    });
  } catch (error) {
    logServerError("api.me", error);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Unable to load your profile." } },
      { status: 500 },
    );
  }
}
