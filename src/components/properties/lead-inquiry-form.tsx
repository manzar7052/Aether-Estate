"use client";

import { useActionState } from "react";
import { submitPropertyInquiry, type LeadActionState } from "@/lib/leads/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LeadInquiryFormProps {
  propertyId: string;
  propertyTitle: string;
  defaultIntent?: "buy" | "rent" | "sell";
  onSuccess?: () => void;
}

export function LeadInquiryForm({
  propertyId,
  propertyTitle,
  defaultIntent = "buy",
  onSuccess,
}: LeadInquiryFormProps) {
  const initialState: LeadActionState = {};

  const [state, formAction, isPending] = useActionState(
    async (prevState: LeadActionState | null, formData: FormData) => {
      const res = await submitPropertyInquiry(prevState, formData);
      if (res.success && onSuccess) {
        onSuccess();
      }
      return res;
    },
    initialState,
  );

  if (state?.success) {
    return (
      <div className="rounded-sm border border-emerald-300 bg-emerald-50/80 p-6 text-center text-emerald-950">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-serif text-lg font-medium text-emerald-900">
          Inquiry Submitted
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-emerald-800">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 text-left">
      <input type="hidden" name="property_id" value={propertyId} />
      <input type="hidden" name="intent" value={defaultIntent} />

      {state?.message && !state.success && (
        <div className="rounded-sm border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800">
          {state.message}
        </div>
      )}

      {/* Full Name */}
      <div className="space-y-1.5">
        <Label htmlFor="lead-name" className="text-xs uppercase tracking-wider text-brand-ink/70">
          Your Name <span className="text-rose-600">*</span>
        </Label>
        <Input
          id="lead-name"
          name="full_name"
          type="text"
          required
          placeholder="e.g. Eleanor Vance"
          className="bg-white/90 text-sm"
        />
        {state?.errors?.full_name && (
          <p className="text-[11px] text-rose-600">{state.errors.full_name[0]}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="lead-email" className="text-xs uppercase tracking-wider text-brand-ink/70">
          Email Address <span className="text-rose-600">*</span>
        </Label>
        <Input
          id="lead-email"
          name="email"
          type="email"
          required
          placeholder="eleanor@example.com"
          className="bg-white/90 text-sm"
        />
        {state?.errors?.email && (
          <p className="text-[11px] text-rose-600">{state.errors.email[0]}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="lead-phone" className="text-xs uppercase tracking-wider text-brand-ink/70">
          Phone Number <span className="text-brand-ink/40">(Optional)</span>
        </Label>
        <Input
          id="lead-phone"
          name="phone"
          type="tel"
          placeholder="+1 (555) 000-0000"
          className="bg-white/90 text-sm"
        />
        {state?.errors?.phone && (
          <p className="text-[11px] text-rose-600">{state.errors.phone[0]}</p>
        )}
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <Label htmlFor="lead-message" className="text-xs uppercase tracking-wider text-brand-ink/70">
          Message / Inquiries <span className="text-rose-600">*</span>
        </Label>
        <textarea
          id="lead-message"
          name="message"
          rows={3}
          required
          defaultValue={`I am interested in learning more about "${propertyTitle}". Please share further details.`}
          className="flex w-full rounded-sm border border-brand-line bg-white/90 p-2.5 text-sm text-brand-ink focus:border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-gold"
        />
        {state?.errors?.message && (
          <p className="text-[11px] text-rose-600">{state.errors.message[0]}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full justify-center text-sm"
      >
        {isPending ? "Sending Inquiry..." : "Submit Inquiry"}
      </Button>

      <p className="text-[10px] text-center text-brand-ink/50">
        Your information is confidential and will only be used to connect with our advisory team.
      </p>
    </form>
  );
}
