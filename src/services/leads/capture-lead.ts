import { createServiceRoleClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/utils/errors";
import {
  getVerifiedConversation,
  isLeadConsentConfirmed,
  linkConversationToLead,
} from "./conversations";
import { qualifyLead } from "@/services/qualification";
import type { PropertyType } from "@/types/database";

export interface CaptureLeadInput {
  conversationId: string;
  accessToken: string;
  name: string;
  email: string;
  phone?: string;
  timeline?: string;
  budget_min?: number;
  budget_max?: number;
  location?: string;
  property_type?: PropertyType;
  bedrooms?: number;
}

export interface CaptureLeadResult {
  leadId: string;
  updated: boolean;
  message: string;
}

/**
 * Captures or updates a lead record from a chatbot conversation.
 * Enforces explicit application-controlled consent verification and duplicate prevention.
 */
export async function captureLeadFromChat(
  input: CaptureLeadInput,
): Promise<CaptureLeadResult> {
  const conversation = await getVerifiedConversation(
    input.conversationId,
    input.accessToken,
  );

  // Independent server-side consent verification:
  // Must have application-recorded confirmation before lead capture is permitted.
  const hasConsent = await isLeadConsentConfirmed(
    input.conversationId,
    input.accessToken,
  );

  if (!hasConsent && !conversation.lead_capture_confirmed_at) {
    throw new AppError(
      "CONSENT_REQUIRED",
      "Explicit user contact confirmation is required before creating a lead.",
      400,
    );
  }

  const supabase = createServiceRoleClient();
  const normalizedEmail = input.email.trim().toLowerCase();
  const cleanName = input.name.trim();
  const cleanPhone = input.phone?.trim() || null;

  const leadPayload = {
    full_name: cleanName,
    email: normalizedEmail,
    phone: cleanPhone,
    source: "chatbot" as const,
    status: "new" as const,
    intent: "buy" as const,
    city: input.location?.trim() || null,
    property_type: input.property_type || null,
    budget_min: input.budget_min ?? null,
    budget_max: input.budget_max ?? null,
    bedrooms: input.bedrooms ?? null,
    timeline: input.timeline || null,
  };

  // 1. Primary Deduplication: If this conversation is already linked to a lead
  if (conversation.lead_id) {
    // Check if it was an anonymous visitor placeholder or real lead
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, full_name, email")
      .eq("id", conversation.lead_id)
      .single();

    if (existingLead) {
      const { error } = await supabase
        .from("leads")
        .update(leadPayload)
        .eq("id", existingLead.id);

      if (!error) {
        // Recalculate qualification score
        try {
          await qualifyLead(existingLead.id);
        } catch (qErr) {
          console.warn("[captureLeadFromChat] Qualification notice:", qErr);
        }

        return {
          leadId: existingLead.id,
          updated: true,
          message: "Lead information updated successfully.",
        };
      }
    }
  }

  // 2. Secondary Deduplication: Check if a lead with this email already exists
  const { data: existingLeadByEmail } = await supabase
    .from("leads")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingLeadByEmail) {
    await supabase
      .from("leads")
      .update(leadPayload)
      .eq("id", existingLeadByEmail.id);

    await linkConversationToLead(input.conversationId, existingLeadByEmail.id);

    // Recalculate qualification score
    try {
      await qualifyLead(existingLeadByEmail.id);
    } catch (qErr) {
      console.warn("[captureLeadFromChat] Qualification notice:", qErr);
    }

    return {
      leadId: existingLeadByEmail.id,
      updated: true,
      message: "Existing lead profile updated and linked to this conversation.",
    };
  }

  // 3. New Lead Insertion
  const { data: newLead, error: insertError } = await supabase
    .from("leads")
    .insert(leadPayload)
    .select("id")
    .single();

  if (insertError || !newLead) {
    console.error(
      "[captureLeadFromChat] Lead insertion error:",
      insertError?.message,
    );
    throw new AppError(
      "LEAD_CREATE_FAILED",
      "Failed to record lead information in database.",
      500,
    );
  }

  // Link conversation to the newly created lead
  await linkConversationToLead(input.conversationId, newLead.id);

  console.log(
    `[Lead Capture] Created new chatbot lead ${newLead.id} for conversation ${input.conversationId}`,
  );

  // Compute and persist qualification score for newly created lead
  try {
    await qualifyLead(newLead.id);
  } catch (qErr) {
    console.warn("[captureLeadFromChat] Qualification notice:", qErr);
  }

  return {
    leadId: newLead.id,
    updated: false,
    message: "New lead created and linked to conversation.",
  };
}
