import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireApiAdmin } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";

export interface AgentSummary {
  id: string;
  full_name: string;
  email: string;
  role: "agent";
  avatar_url?: string | null;
}

/**
 * Retrieves the active agent roster for admin assignment selectors.
 * Strictly restricted to administrators.
 */
export async function listAssignableAgents(): Promise<AgentSummary[]> {
  // 1. Authorize administrator
  await requireApiAdmin();

  const supabase = await createServerSupabaseClient();

  let { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .eq("role", "agent")
    .order("full_name", { ascending: true });

  // Fallback to service role if needed
  if ((error || !data) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createServiceRoleClient();
    const fallback = await admin
      .from("profiles")
      .select("id, full_name, email, role, avatar_url")
      .eq("role", "agent")
      .order("full_name", { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("[listAssignableAgents] Failed querying agents:", error.message);
    throw new AppError("DB_QUERY_FAILED", "Unable to load agent roster.", 500);
  }

  return (data || []) as AgentSummary[];
}
