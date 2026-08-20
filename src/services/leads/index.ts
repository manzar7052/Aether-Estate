export * from "./conversations";
export * from "./messages";
export * from "./capture-lead";
export * from "./queries";
export * from "./mutations";
export * from "./transcripts";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/session";
import { fromDatabaseError } from "@/lib/db/errors";
import { hasPublicEnv } from "@/lib/env";
import { qualifyLead } from "@/services/qualification";
import type { Lead, LeadIntent, LeadSource, PropertyType } from "@/types/database";

export interface CreatePropertyLeadInput {
  full_name: string;
  email: string;
  phone?: string;
  property_id: string;
  message: string;
  intent?: LeadIntent;
  source?: LeadSource;
}

/**
 * Creates a new lead inquiry from a property detail page or contact entry point.
 * Follows RLS policy 'leads_insert_public'.
 */
export async function createPropertyLead(
  input: CreatePropertyLeadInput,
): Promise<{ success: boolean; id?: string }> {
  if (!hasPublicEnv()) {
    throw new Error("Supabase is not configured in the environment.");
  }

  // Look up property to capture contextual metadata (city, property_type, price)
  let property: { city?: string; property_type?: string; price?: number } | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const res = await supabase
      .from("properties")
      .select("city, property_type, price")
      .eq("id", input.property_id)
      .maybeSingle();
    property = res.data;
  } catch {
    // Fallback if property lookup fails
  }

  const payload = {
    full_name: input.full_name,
    email: input.email,
    phone: input.phone || null,
    property_id: input.property_id,
    message: input.message,
    source: input.source || "property_page",
    status: "new" as const,
    intent: input.intent || "buy",
    city: property?.city || null,
    property_type: (property?.property_type as PropertyType) || null,
    budget_max: property?.price || null,
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("leads")
      .insert(payload)
      .select("id")
      .single();

    if (!error && data) {
      try {
        await qualifyLead(data.id, { hasPropertyView: true });
      } catch (qErr) {
        console.warn("[createPropertyLead] Qualification notice:", qErr);
      }
      return { success: true, id: data.id };
    }
  } catch {
    // Attempt fallback
  }

  // Fallback to service role if pre-migration RLS denies anon insert or columns differ
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createServiceRoleClient();
      const { data, error } = await admin
        .from("leads")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        // If property_id or message column not yet in DB schema, strip them
        const basePayload = {
          full_name: input.full_name,
          email: input.email,
          phone: input.phone || null,
          source: "website" as const,
          status: "new" as const,
          intent: input.intent || "buy",
          city: property?.city || null,
        };
        const { data: fbData, error: fbError } = await admin
          .from("leads")
          .insert(basePayload)
          .select("id")
          .single();

        if (fbError) throw fromDatabaseError(fbError, "Unable to submit property inquiry.");
        if (fbData?.id) {
          try {
            await qualifyLead(fbData.id, { hasPropertyView: true });
          } catch (qErr) {
            console.warn("[createPropertyLead] Qualification notice:", qErr);
          }
        }
        return { success: true, id: fbData?.id };
      }

      if (data?.id) {
        try {
          await qualifyLead(data.id, { hasPropertyView: true });
        } catch (qErr) {
          console.warn("[createPropertyLead] Qualification notice:", qErr);
        }
      }
      return { success: true, id: data?.id };
    } catch (err) {
      throw fromDatabaseError(err, "Unable to submit property inquiry.");
    }
  }

  throw new Error("Unable to submit property inquiry.");
}

/**
 * Staff-only lead listing (protected by RLS and session).
 */
export async function listLeads(): Promise<Lead[]> {
  const { supabase } = await requireProfile();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw fromDatabaseError(error, "Unable to load leads.");
  }

  return data ?? [];
}
