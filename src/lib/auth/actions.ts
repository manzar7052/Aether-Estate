"use server";

import { redirect } from "next/navigation";
import { routes } from "@/config/site";
import { homeForRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validations/auth";
import { logServerError } from "@/lib/utils/errors";

export type AuthActionState = {
  error: string | null;
  notice: string | null;
};

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid login details.",
      notice: null,
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      logServerError("auth.signIn", error);
      return { error: "Invalid email or password.", notice: null };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .maybeSingle();

    redirect(homeForRole(profile?.role === "admin" ? "admin" : "agent"));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    logServerError("auth.signIn", error);
    return { error: "Unable to sign in. Try again.", notice: null };
  }
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid signup details.",
      notice: null,
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
      },
    });

    if (error) {
      logServerError("auth.signUp", error);
      return { error: signupErrorMessage(error.message), notice: null };
    }

    if (data.session) {
      redirect(routes.dashboard);
    }

    return {
      error: null,
      notice:
        "Check your email to confirm your account before signing in. If confirmation is disabled in Supabase, sign in now.",
    };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    logServerError("auth.signUp", error);
    return { error: "Unable to create an account. Try again.", notice: null };
  }
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect(routes.login);
}

function signupErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already") || lower.includes("registered")) {
    return "An account with this email already exists.";
  }
  if (lower.includes("password")) {
    return "Password does not meet the project requirements.";
  }
  return "Unable to create an account. Check your details and try again.";
}

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}
