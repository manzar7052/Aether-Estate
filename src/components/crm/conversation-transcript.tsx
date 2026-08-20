"use client";

import { useEffect, useState } from "react";
import type { LeadTranscriptResult } from "@/services/leads";

interface ConversationTranscriptProps {
  leadId: string;
}

export function ConversationTranscript({ leadId }: ConversationTranscriptProps) {
  const [transcript, setTranscript] = useState<LeadTranscriptResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTranscript() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/leads/${leadId}/transcript`);
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load transcript.");
        }

        setTranscript(data.transcript);
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the conversation transcript.",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTranscript();

    return () => {
      isMounted = false;
    };
  }, [leadId]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-brand-line bg-brand-cream/20 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-brand-gold/40 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-slate">
            Loading Conversation Transcript...
          </span>
        </div>
        <div className="space-y-3">
          <div className="h-14 w-3/4 rounded-2xl bg-brand-sand/50 animate-pulse" />
          <div className="ml-auto h-12 w-2/3 rounded-2xl bg-brand-sand/70 animate-pulse" />
          <div className="h-16 w-4/5 rounded-2xl bg-brand-sand/50 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 text-center">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-rose-800">
          Unable to load the conversation transcript.
        </p>
        <p className="mt-1 text-[11px] text-rose-600">
          {error === "Lead not found."
            ? "This conversation is not available to your account."
            : error}
        </p>
      </div>
    );
  }

  if (!transcript || transcript.messages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-line bg-brand-cream/20 p-6 text-center">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-sand text-brand-gold mb-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <p className="text-xs font-semibold text-brand-ink">
          No conversation transcript is available for this lead.
        </p>
        <p className="mt-1 text-[11px] text-brand-slate max-w-sm mx-auto">
          This prospect was captured directly via property inquiry form or website entry point without using the AI chat concierge.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-line bg-brand-cream/30 p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-brand-line/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-sand text-brand-gold">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h4 className="font-serif font-bold text-sm text-brand-ink">
            AI Conversation Transcript
          </h4>
        </div>
        <span className="rounded-full bg-brand-sand px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-ink">
          {transcript.messages.length} Messages
        </span>
      </div>

      {/* Message Stream */}
      <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
        {transcript.messages.map((msg) => {
          const isUser = msg.role === "user";
          const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-brand-slate">
                <span className="font-semibold capitalize">
                  {isUser ? transcript.leadName || "Visitor" : "Aether AI Assistant"}
                </span>
                <span>•</span>
                <span>{formattedTime}</span>
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                  isUser
                    ? "bg-brand-ink text-white rounded-br-sm"
                    : "bg-white border border-brand-line/80 text-brand-ink rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
