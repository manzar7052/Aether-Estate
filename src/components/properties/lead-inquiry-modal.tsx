"use client";

import { useState, useEffect } from "react";
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/button";
import { LeadInquiryForm } from "./lead-inquiry-form";

interface LeadInquiryModalProps {
  propertyId: string;
  propertyTitle: string;
  triggerText?: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  className?: string;
  modalTitle?: string;
  defaultIntent?: "buy" | "rent" | "sell";
}

export function LeadInquiryModal({
  propertyId,
  propertyTitle,
  triggerText = "Request Property Details",
  triggerVariant = "default",
  triggerSize = "default",
  className = "",
  modalTitle = "Inquire About This Property",
  defaultIntent = "buy",
}: LeadInquiryModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <>
      <Button
        variant={triggerVariant}
        size={triggerSize}
        onClick={() => setIsOpen(true)}
        className={className}
      >
        {triggerText}
      </Button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inquiry-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-brand-ink/70 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-lg rounded-sm border border-brand-line bg-brand-cream p-6 sm:p-8 shadow-xl">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-sm text-brand-ink/70 hover:bg-brand-sand hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="mb-6">
              <p className="text-[11px] font-semibold tracking-wider uppercase text-brand-gold">
                Aether Estates Advisory
              </p>
              <h2
                id="inquiry-modal-title"
                className="mt-1 font-serif text-2xl font-normal text-brand-ink"
              >
                {modalTitle}
              </h2>
              <p className="mt-1 text-xs text-brand-ink/70 line-clamp-1">
                {propertyTitle}
              </p>
            </div>

            {/* Form */}
            <LeadInquiryForm
              propertyId={propertyId}
              propertyTitle={propertyTitle}
              defaultIntent={defaultIntent}
            />
          </div>
        </div>
      )}
    </>
  );
}
