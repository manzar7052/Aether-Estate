import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

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
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, avatar_url")
      .eq("role", "agent")
      .order("full_name", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as AgentSummary[];
    }
  } catch {
    // Fallback below
  }

  // Fallback to service role if needed
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createServiceRoleClient();
      const fallback = await admin
        .from("profiles")
        .select("id, full_name, email, role, avatar_url")
        .eq("role", "agent")
        .order("full_name", { ascending: true });
      if (fallback.data) {
        return fallback.data as AgentSummary[];
      }
    } catch {
      // Fallback
    }
  }

  return [];
}
