import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getDb() {
  return createServerSupabaseClient();
}
