"use server";

import { propertyInquirySchema } from "@/lib/validations/lead";
import { createPropertyLead } from "@/services/leads";

export interface LeadActionState {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export async function submitPropertyInquiry(
  _prevState: LeadActionState | null,
  formData: FormData,
): Promise<LeadActionState> {
  const rawData = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    property_id: formData.get("property_id"),
    message: formData.get("message"),
    intent: formData.get("intent") || "buy",
  };

  const parsed = propertyInquirySchema.safeParse(rawData);

  if (!parsed.success) {
    const errorMap = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      errors: errorMap,
      message: "Please check the form for invalid inputs.",
    };
  }

  try {
    await createPropertyLead({
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      property_id: parsed.data.property_id,
      message: parsed.data.message,
      intent: parsed.data.intent,
      source: "property_page",
    });

    return {
      success: true,
      message:
        "Thank you! Your inquiry has been received. An Aether Estates specialist will reach out shortly.",
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Something went wrong. Please try again.";
    return {
      success: false,
      message: errorMsg,
    };
  }
}
