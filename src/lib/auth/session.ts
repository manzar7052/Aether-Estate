import { redirect } from "next/navigation";
import { routes } from "@/config/site";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import type { Profile, UserRole } from "@/types/database";

export async function getSessionUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getCurrentProfile(): Promise<{
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
} | null> {
  const { supabase, user } = await getSessionUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return { profile: data, supabase };
}

export async function requireProfile() {
  const result = await getCurrentProfile();
  if (!result) {
    redirect(routes.login);
  }
  return result;
}

export async function requireRole(role: UserRole) {
  const result = await requireProfile();
  if (result.profile.role !== role) {
    redirect(routes.unauthorized);
  }
  return result;
}

export async function requireAdmin() {
  return requireRole("admin");
}

export async function requireAgent() {
  return requireRole("agent");
}

export async function requireStaff() {
  const result = await requireProfile();
  if (result.profile.role !== "admin" && result.profile.role !== "agent") {
    redirect(routes.unauthorized);
  }
  return result;
}

export async function requireApiProfile() {
  const result = await getCurrentProfile();
  if (!result) {
    throw new AppError("UNAUTHORIZED", "Authentication required. Please sign in.", 401);
  }
  return result;
}

export async function requireApiRole(role: UserRole) {
  const result = await requireApiProfile();
  if (result.profile.role !== role) {
    throw new AppError("FORBIDDEN", "You do not have access to this resource.", 403);
  }
  return result;
}

export async function requireApiAdmin() {
  return requireApiRole("admin");
}

export async function requireApiStaff() {
  const result = await requireApiProfile();
  if (result.profile.role !== "admin" && result.profile.role !== "agent") {
    throw new AppError("FORBIDDEN", "Staff access required.", 403);
  }
  return result;
}

export function assertRole(profile: Profile, role: UserRole) {
  if (profile.role !== role) {
    throw new AppError("FORBIDDEN", "You do not have access to this resource.", 403);
  }
}

export function homeForRole(role: UserRole): string {
  return role === "admin" ? routes.admin : routes.dashboard;
}
