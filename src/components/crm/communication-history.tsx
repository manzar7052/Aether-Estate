"use client";

import { useState, useEffect } from "react";
import type {
  CommunicationChannel,
  CommunicationStatus,
  CommunicationLog,
} from "@/types/database";

interface CommunicationHistoryProps {
  leadId: string;
  refreshKey?: number;
}

export function CommunicationHistory({
  leadId,
  refreshKey = 0,
}: CommunicationHistoryProps) {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [channelFilter, setChannelFilter] = useState<CommunicationChannel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<CommunicationStatus | "all">("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: "1",
          limit: "15",
          channel: channelFilter,
          status: statusFilter,
        });

        const res = await fetch(`/api/leads/${leadId}/communication-logs?${params.toString()}`);
        const data = await res.json();

        if (!active) return;
        if (!res.ok) {
          throw new Error(data.error || `Failed to load communication history (${res.status})`);
        }

        if (data.success && Array.isArray(data.logs)) {
          setLogs(data.logs);
          setHasMore(data.pagination.page < data.pagination.totalPages);
          setPage(data.pagination.page);
        }
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Failed to load history";
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
  }, [leadId, channelFilter, statusFilter, refreshKey]);

  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      setError(null);

      const nextPage = page + 1;
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "15",
        channel: channelFilter,
        status: statusFilter,
      });

      const res = await fetch(`/api/leads/${leadId}/communication-logs?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to load older logs (${res.status})`);
      }

      if (data.success && Array.isArray(data.logs)) {
        setLogs((prev) => [...prev, ...data.logs]);
        setHasMore(data.pagination.page < data.pagination.totalPages);
        setPage(data.pagination.page);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load older logs";
      setError(msg);
    } finally {
      setLoadingMore(false);
    }
  };

  const formatEventTitle = (eventType: string) => {
    switch (eventType) {
      case "appointment.created":
        return "Appointment Confirmed";
      case "appointment.rescheduled":
        return "Appointment Rescheduled";
      case "appointment.cancelled":
        return "Appointment Cancelled";
      case "appointment.reminder_24h":
        return "Showing Reminder (24h Prior)";
      case "appointment.reminder_1h":
        return "Urgent Showing Reminder (1h Prior)";
      default:
        return eventType.replace(/\./g, " · ");
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(d);
    } catch {
      return iso;
    }
  };

  return (
    <div className="rounded-2xl border border-brand-line bg-white p-5 shadow-sm space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-line/60 pb-3">
        <div>
          <h4 className="font-serif font-bold text-sm text-brand-ink flex items-center gap-2">
            <span>Communication History</span>
            <span className="text-[10px] font-sans font-semibold bg-brand-sand px-2 py-0.5 rounded-full text-brand-slate">
              {logs.length} logged
            </span>
          </h4>
          <p className="text-xs text-brand-slate mt-0.5">
            Auditable delivery outcomes across Email and WhatsApp channels.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as CommunicationChannel | "all")}
            className="rounded-lg border border-brand-line bg-brand-cream/30 px-2.5 py-1 text-xs text-brand-ink font-medium focus:border-brand-gold focus:outline-none"
          >
            <option value="all">All Channels</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CommunicationStatus | "all")}
            className="rounded-lg border border-brand-line bg-brand-cream/30 px-2.5 py-1 text-xs text-brand-ink font-medium focus:border-brand-gold focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="skipped">Skipped</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && logs.length === 0 ? (
        <div className="py-8 text-center text-xs text-brand-slate">
          Loading communication timeline...
        </div>
      ) : logs.length === 0 ? (
        /* Empty State */
        <div className="py-8 text-center rounded-xl bg-brand-cream/20 border border-brand-line/40">
          <p className="text-xs text-brand-slate font-medium">
            No communication events recorded yet.
          </p>
          <p className="text-[11px] text-brand-slate/70 mt-1">
            Communication attempts and delivery outcomes will appear here automatically.
          </p>
        </div>
      ) : (
        /* Timeline List */
        <div className="space-y-2.5">
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                className="rounded-xl border border-brand-line/70 bg-brand-cream/10 p-3.5 hover:bg-brand-cream/30 transition text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Channel Badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        log.channel === "whatsapp"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-blue-100 text-blue-800 border border-blue-300"
                      }`}
                    >
                      {log.channel === "whatsapp" ? "💬 WhatsApp" : "📧 Email"}
                    </span>

                    {/* Event Title */}
                    <span className="font-bold text-brand-ink">
                      {formatEventTitle(log.event_type)}
                    </span>

                    {/* Recipient Type */}
                    <span className="text-[11px] text-brand-slate capitalize">
                      ({log.recipient_type})
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {log.status === "sent" && (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                        ✓ Sent
                      </span>
                    )}
                    {log.status === "skipped" && (
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                        ⏸ Skipped
                      </span>
                    )}
                    {log.status === "failed" && (
                      <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200">
                        ✕ Failed
                      </span>
                    )}
                    {log.status === "pending" && (
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-700 border border-gray-200">
                        ⏳ Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtitle / Details */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-brand-slate pt-1">
                  <div>
                    <span>Recipient: </span>
                    <span className="font-mono text-brand-ink font-medium">
                      {log.recipient}
                    </span>
                    {log.error_code && (
                      <span className="ml-2 font-medium text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded text-[10px]">
                        Reason: {log.error_code}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span>{formatDateTime(log.sent_at || log.created_at)} CT</span>
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="text-brand-gold hover:underline font-medium text-[10px]"
                    >
                      {isExpanded ? "Hide Details" : "Details"}
                    </button>
                  </div>
                </div>

                {/* Expandable Safe Metadata Drawer */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-brand-line/60 bg-white p-2.5 rounded-lg text-[10px] space-y-1 font-mono text-brand-slate">
                    <div>
                      <span className="font-semibold text-brand-ink">Log ID: </span>
                      <span>{log.id}</span>
                    </div>
                    {log.template && (
                      <div>
                        <span className="font-semibold text-brand-ink">Template: </span>
                        <span>{log.template}</span>
                      </div>
                    )}
                    {log.provider_message_id && (
                      <div>
                        <span className="font-semibold text-brand-ink">Provider Message ID: </span>
                        <span>{log.provider_message_id}</span>
                      </div>
                    )}
                    {log.error_message && (
                      <div>
                        <span className="font-semibold text-red-600">Error: </span>
                        <span className="text-red-700">{log.error_message}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-xl border border-brand-line bg-white px-4 py-1.5 text-xs font-semibold text-brand-ink shadow-sm hover:bg-brand-sand transition disabled:opacity-50"
              >
                {loadingMore ? "Loading more..." : "Load Older Logs"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
