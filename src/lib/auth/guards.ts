import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";
import type { Profile, UserRole } from "@/types/database";

export async function requireApiProfile(): Promise<
  | { ok: true; profile: Profile }
  | { ok: false; response: NextResponse }
> {
  const result = await getCurrentProfile();
  if (!result) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
        { status: 401 },
      ),
    };
  }
  return { ok: true, profile: result.profile };
}

export function requireApiRole(profile: Profile, role: UserRole) {
  if (profile.role !== role) {
    throw new AppError("FORBIDDEN", "You do not have access to this resource.", 403);
  }
}
