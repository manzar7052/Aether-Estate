import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv, hasPublicEnv } from "@/lib/env";
import { routes } from "@/config/site";
import type { Database, UserRole } from "@/types/database";

export async function updateSession(request: NextRequest) {
  if (!hasPublicEnv()) {
    return NextResponse.next({ request });
  }

  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path === routes.login || path === routes.signup;
  const isAdmin = path === routes.admin || path.startsWith(`${routes.admin}/`);
  const isDashboard =
    path === routes.dashboard || path.startsWith(`${routes.dashboard}/`);

  if (!user && (isAdmin || isDashboard)) {
    const url = request.nextUrl.clone();
    url.pathname = routes.login;
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && (isAdmin || isDashboard || isAuthPage)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const role = profile?.role as UserRole | undefined;
    const home = role === "admin" ? routes.admin : routes.dashboard;

    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (isAdmin && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = routes.unauthorized;
      return NextResponse.redirect(url);
    }

    if (isDashboard && role === "admin") {
      const url = request.nextUrl.clone();
      url.pathname = routes.admin;
      return NextResponse.redirect(url);
    }
  }

  return response;
}
