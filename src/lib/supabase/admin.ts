import { createClient } from "@supabase/supabase-js";
import { getPublicEnv, getServiceRoleKey } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role client. Server-only. Bypasses RLS — use for seed/admin jobs,
 * never in Client Components or for end-user request paths unless a later
 * phase has a tightly scoped justification.
 */
export function createServiceRoleClient() {
  const { supabaseUrl } = getPublicEnv();
  return createClient<Database>(supabaseUrl, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
