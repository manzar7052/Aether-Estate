"use client";

import { useState, useEffect } from "react";
import type { Lead } from "@/types/database";
import type { CommunicationPreferences as PreferencesType } from "@/services/notifications/logs/types";

interface CommunicationPreferencesProps {
  lead: Lead;
  onLeadUpdated?: (lead: Lead) => void;
}

export function CommunicationPreferences({
  lead,
  onLeadUpdated,
}: CommunicationPreferencesProps) {
  const [preferences, setPreferences] = useState<PreferencesType | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/leads/${lead.id}/preferences`);
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          throw new Error(data.error || `Failed to load preferences (${res.status})`);
        }
        if (data.success && data.preferences) {
          setPreferences(data.preferences);
        }
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Failed to load preferences";
        setError(msg);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [lead.id]);

  const handleToggleWhatsApp = async () => {
    if (!preferences || updating) return;

    const newOptIn = !preferences.whatsapp.optIn;
    setUpdating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/leads/${lead.id}/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappOptIn: newOptIn }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update WhatsApp preference");
      }

      setPreferences(data.preferences);
      setSuccessMsg(
        newOptIn
          ? "WhatsApp notifications enabled."
          : "WhatsApp notifications disabled (opted out).",
      );

      if (onLeadUpdated) {
        onLeadUpdated({
          ...lead,
          whatsapp_opt_in: newOptIn,
          whatsapp_opt_in_at: data.preferences.whatsapp.optInAt,
          whatsapp_opt_out_at: data.preferences.whatsapp.optOutAt,
        });
      }

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update preference";
      setError(msg);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-brand-line bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-brand-line/60 pb-3">
        <div>
          <h4 className="font-serif font-bold text-sm text-brand-ink flex items-center gap-2">
            <span>Communication Preferences</span>
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider bg-brand-sand px-2 py-0.5 rounded-full text-brand-slate">
              Transactional
            </span>
          </h4>
          <p className="text-xs text-brand-slate mt-0.5">
            Controls channel eligibility for automated appointment notifications and reminders.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-medium">
          ✓ {successMsg}
        </div>
      )}

      {loading ? (
        <div className="py-4 text-center text-xs text-brand-slate">
          Loading communication preferences...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Email Channel Card */}
          <div className="rounded-xl border border-brand-line/80 bg-brand-cream/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">📧</span>
                <span className="text-xs font-bold text-brand-ink">
                  Email Notifications
                </span>
              </div>
              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                Active (Default)
              </span>
            </div>
            <p className="text-[11px] text-brand-slate leading-relaxed">
              Appointment confirmations, calendar updates, and scheduled reminders sent to{" "}
              <span className="font-medium text-brand-ink">{lead.email}</span>.
            </p>
          </div>

          {/* WhatsApp Channel Card */}
          <div className="rounded-xl border border-brand-line/80 bg-brand-cream/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <span className="text-xs font-bold text-brand-ink">
                  WhatsApp Notifications
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleWhatsApp}
                disabled={updating}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  preferences?.whatsapp.optIn ? "bg-emerald-600" : "bg-gray-300"
                } ${updating ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    preferences?.whatsapp.optIn ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <p className="text-[11px] text-brand-slate leading-relaxed">
              {lead.phone ? (
                <>
                  Destination:{" "}
                  <span className="font-mono text-brand-ink font-medium">
                    {lead.phone}
                  </span>
                </>
              ) : (
                <span className="text-amber-700 italic">No phone number recorded.</span>
              )}
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-brand-line/40 text-[10px] text-brand-slate">
              <span>Status:</span>
              <span
                className={`font-semibold ${
                  preferences?.whatsapp.optIn ? "text-emerald-700" : "text-amber-800"
                }`}
              >
                {preferences?.whatsapp.optIn ? "Opted In" : "Disabled / Opted Out"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
