"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { ChatMessage, CompactProperty } from "@/services/ai/types";

const INITIAL_GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hello! I am the Aether Estates Concierge. I can help you search our live database of luxury estates (Austin, Miami, Denver, Seattle, Dallas, and San Francisco), refine your search criteria, and connect you directly with a dedicated advisor for private viewings.",
};

const SUGGESTIONS = [
  "Show me 3-bedroom homes in Austin",
  "Find waterfront properties in Miami",
  "Show modern homes in Denver under $2M",
  "Connect me with an advisor for a private showing",
];

const SESSION_STORAGE_KEY = "aether_chat_session_v3";

interface ChatSession {
  conversationId: string;
  accessToken: string;
  isConsentConfirmed: boolean;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function ChatPropertyCard({ property }: { property: CompactProperty }) {
  return (
    <div className="flex overflow-hidden rounded-sm border border-brand-line/80 bg-white shadow-xs transition-all hover:border-brand-ink/40">
      {property.image_url && (
        <div className="relative h-20 w-24 shrink-0 bg-brand-sand/40">
          <Image
            src={property.image_url}
            alt={property.title}
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col justify-between p-2.5 min-w-0">
        <div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="font-serif text-xs font-semibold text-brand-ink">
              {formatPrice(property.price)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-brand-gold font-medium truncate">
              {property.city}, {property.state}
            </span>
          </div>
          <h4 className="text-[11px] font-medium text-brand-ink line-clamp-1 mt-0.5">
            {property.title}
          </h4>
          <p className="text-[10px] text-brand-ink/60 mt-0.5">
            {property.bedrooms ?? "–"} beds &bull; {property.bathrooms} baths &bull;{" "}
            {property.area_sqft ? `${property.area_sqft.toLocaleString()} sqft` : ""}
          </p>
        </div>
        <div className="mt-1.5 pt-1 border-t border-brand-line/40">
          <Link
            href={property.url}
            className="inline-flex items-center text-[10px] font-semibold text-brand-gold hover:text-brand-ink transition-colors"
          >
            View Property Details &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRehydrating, setIsRehydrating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Rehydrate conversation session from localStorage asynchronously
  useEffect(() => {
    let isMounted = true;

    async function rehydrateSession() {
      try {
        const saved = typeof window !== "undefined" ? localStorage.getItem(SESSION_STORAGE_KEY) : null;
        if (!saved) {
          if (isMounted) setIsRehydrating(false);
          return;
        }

        const parsed: ChatSession = JSON.parse(saved);
        if (!parsed.conversationId || !parsed.accessToken) {
          if (isMounted) setIsRehydrating(false);
          return;
        }

        if (isMounted) {
          setSession(parsed);
        }

        const res = await fetch(
          `/api/chat/history?conversationId=${encodeURIComponent(
            parsed.conversationId,
          )}&accessToken=${encodeURIComponent(parsed.accessToken)}`,
        );

        if (res.ok && isMounted) {
          const data = await res.json();
          if (data?.messages && data.messages.length > 0) {
            setMessages(data.messages);
            if (data.isConsentConfirmed) {
              setSession((prev) =>
                prev ? { ...prev, isConsentConfirmed: true } : prev,
              );
            }
          }
        }
      } catch (err) {
        console.warn("[ChatWidget] Failed rehydrating history:", err);
      } finally {
        if (isMounted) {
          setIsRehydrating(false);
        }
      }
    }

    rehydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isLoading]);

  const handleSendMessage = async (
    textToSend?: string,
    confirmConsent?: boolean,
  ) => {
    const messageContent = (textToSend ?? input).trim();
    if (!messageContent || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: messageContent,
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const payload = {
        conversationId: session?.conversationId,
        accessToken: session?.accessToken,
        confirmConsent: confirmConsent ?? false,
        messages: newHistory.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to communicate with AI Assistant.");
      }

      // Update session credentials
      if (data.conversationId && data.accessToken) {
        const newSession: ChatSession = {
          conversationId: data.conversationId,
          accessToken: data.accessToken,
          isConsentConfirmed: Boolean(
            data.isConsentConfirmed || session?.isConsentConfirmed,
          ),
        };
        setSession(newSession);
        try {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
        } catch {
          // Ignore storage errors
        }
      }

      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([INITIAL_GREETING]);
    setSession(null);
    setError(null);
    setInput("");
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  // Determine if assistant just offered to connect with an advisor
  const lastMessage = messages[messages.length - 1];
  const isOfferingContact =
    lastMessage?.role === "assistant" &&
    !session?.isConsentConfirmed &&
    (lastMessage.content.toLowerCase().includes("advisor to connect") ||
      lastMessage.content.toLowerCase().includes("contact you") ||
      lastMessage.content.toLowerCase().includes("connect me") ||
      lastMessage.content.toLowerCase().includes("share your name"));

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Aether AI Concierge Chat"
          className="group flex items-center gap-3 rounded-full bg-brand-ink px-5 py-3.5 text-brand-cream shadow-xl transition-all duration-300 hover:scale-105 hover:bg-brand-ink/90 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-brand-gold cursor-pointer"
        >
          <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-brand-gold/20 border border-brand-gold/40 text-brand-cream">
            <span className="font-serif text-xs font-semibold">Æ</span>
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-brand-ink" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-medium tracking-wide">Aether Concierge</span>
            <span className="text-[10px] text-brand-cream/60">
              {session ? "Continue Conversation" : "Search & Connect"}
            </span>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Aether Estates AI Chat"
          className="flex h-[560px] w-[calc(100vw-32px)] max-w-[420px] flex-col overflow-hidden rounded-md border border-brand-line/90 bg-brand-cream shadow-2xl transition-all sm:h-[600px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-line/80 bg-brand-ink px-4 py-3 text-brand-cream">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gold/20 border border-brand-gold/50">
                <span className="font-serif text-xs font-semibold text-brand-gold">Æ</span>
              </div>
              <div>
                <h3 className="font-serif text-sm font-medium text-brand-cream">
                  Aether Concierge
                </h3>
                <p className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Search &amp; Lead Routing
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                title="Reset conversation"
                className="rounded p-1.5 text-brand-cream/60 hover:bg-white/10 hover:text-brand-cream focus:outline-none cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="rounded p-1.5 text-brand-cream/60 hover:bg-white/10 hover:text-brand-cream focus:outline-none cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-md px-3.5 py-2.5 leading-relaxed ${
                    msg.role === "user"
                      ? "bg-brand-ink text-brand-cream rounded-br-2xs"
                      : "bg-brand-sand/70 text-brand-ink border border-brand-line/60 rounded-bl-2xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Render Compact Property Cards if returned */}
                  {msg.properties && msg.properties.length > 0 && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-brand-line/60">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-gold">
                        Featured Matches ({msg.properties.length}):
                      </p>
                      <div className="space-y-1.5">
                        {msg.properties.map((prop) => (
                          <ChatPropertyCard key={prop.id} property={prop} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Interactive Explicit Contact Confirmation Buttons */}
            {isOfferingContact && !isLoading && (
              <div className="rounded-md border border-brand-gold/40 bg-brand-sand/40 p-3 my-2 space-y-2">
                <p className="text-[11px] font-medium text-brand-ink">
                  Would you like an Aether Estates advisor to contact you?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        "Yes, please connect me with an Aether Estates advisor.",
                        true,
                      )
                    }
                    className="rounded-sm bg-brand-ink px-3 py-1.5 text-[11px] font-semibold text-brand-cream hover:bg-brand-gold hover:text-brand-ink transition-colors cursor-pointer"
                  >
                    Yes, connect me
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        "Not now, I would like to continue browsing properties.",
                        false,
                      )
                    }
                    className="rounded-sm border border-brand-line bg-white px-3 py-1.5 text-[11px] font-medium text-brand-ink/80 hover:bg-brand-sand transition-colors cursor-pointer"
                  >
                    Not now
                  </button>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start">
                <div className="flex items-center gap-1.5 rounded-md border border-brand-line/60 bg-brand-sand/70 px-4 py-3 text-brand-ink">
                  <span className="h-2 w-2 rounded-full bg-brand-gold animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-brand-gold animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-brand-gold animate-bounce" />
                  <span className="text-[10px] text-brand-ink/60 ml-2">Consulting advisor...</span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-[11px] text-rose-800">
                <p className="font-semibold">Notice</p>
                <p className="mt-0.5">{error}</p>
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="mt-2 text-xs font-semibold text-rose-900 underline hover:no-underline cursor-pointer"
                >
                  Retry request
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Starter Suggestions (Shown if conversation has only greeting) */}
          {messages.length === 1 && !isLoading && !isRehydrating && (
            <div className="border-t border-brand-line/50 bg-brand-sand/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-ink/50 mb-1.5">
                Suggested searches:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(item)}
                    className="rounded-sm border border-brand-line bg-white/90 px-2.5 py-1 text-[11px] text-brand-ink hover:bg-brand-sand hover:text-brand-ink transition-colors text-left cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="border-t border-brand-line/80 bg-brand-cream p-3"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about properties or connect with an advisor..."
                disabled={isLoading}
                maxLength={2000}
                className="flex-1 rounded-sm border border-brand-line bg-white px-3 py-2 text-xs text-brand-ink placeholder:text-brand-ink/40 focus:border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-gold disabled:opacity-50"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || isLoading}
                className="px-3 cursor-pointer"
              >
                Send
              </Button>
            </div>
            <p className="mt-1.5 text-center text-[9px] text-brand-ink/50">
              Aether AI Concierge &bull; Persistent Chat &amp; Verified Lead Routing
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
