# Technical Case Study: Aether Estates

> **AI-Powered Real Estate Lead-to-Appointment Automation Platform**
> Architecture, Engineering Decisions, Security, and Production Verification.

---

## 1. Executive Summary

Aether Estates is a production-ready real estate technology platform designed to solve one of the biggest bottlenecks in luxury brokerage operations: **lead capture, immediate qualification, agent routing, and appointment scheduling latency**.

Rather than treating AI as an isolated chatbot or an unvetted autonomous agent, Aether Estates implements an end-to-end architecture where **Google Gemini provides conversational intelligence and property search assistance**, while a **hardened Next.js and PostgreSQL backend deterministically enforces qualification scores, agent isolation, calendar conflict protection, and multi-channel transactional notifications**.

The entire system was developed through structured development phases and verified with an automated test suite comprising **235 passed tests (100% pass rate)** across security, business logic, concurrent bookings, and production smoke tests.

---

## 2. The Business Problem

Traditional luxury real estate brokerages face substantial friction in converting inbound digital traffic into booked showings:
1. **Slow Lead Response Time**: Inbound website visitors frequently submit inquiries after business hours. By the time an agent manually reviews an email or spreadsheet lead form (often 12–24 hours later), the prospect's buying intent has dropped significantly.
2. **Inconsistent Qualification**: Manual lead qualification is subjective. Agents often spend hours chasing unqualified leads while high-intent, multi-million-dollar buyers wait for responses.
3. **Appointment Coordination Overhead**: Back-and-forth email chains to find mutual showing times introduce drop-off and double-booking risks.
4. **Data Fragmentation**: Communication history (emails, chat transcripts, WhatsApp messages) is scattered across individual agent smartphones and personal mailboxes, leaving brokerage management with zero visibility.

---

## 3. The Solution

Aether Estates automates the entire prospect lifecycle within a unified, secure system:
* **24/7 AI Concierge**: Inbound visitors engage in a natural conversation to explore luxury listings filtered by location, budget, and architectural preferences.
* **Instant Lead Capture & Deterministic Qualification**: Prospects provide contact details in-chat. The platform extracts structured signals, merges them with explicit inputs, and executes a transparent 100-point scoring algorithm that categorizes leads into `HOT`, `WARM`, and `COLD` tiers.
* **Streamlined Agent Assignment & Isolated CRM**: Leads are routed to licensed agents who access full conversation transcripts, contact preferences, and scoring breakdowns with strict row-level security isolation.
* **Real-Time Calendar & Showing Booking**: Qualified prospects and agents schedule showings within live availability windows protected by database-level conflict locks.
* **Transactional Email & WhatsApp Automation**: Automated booking confirmations, reschedule notifications, cancellations, and 24h/1h showing reminders are dispatched seamlessly.

---

## 4. End-to-End Product Workflow

```
VISITOR (Browses Luxury Catalog)
   │
   ▼
AI CONCIERGE (Conversational Discovery)
   │
   ▼
PROPERTY SEARCH (Gemini Function Calling against DB)
   │
   ▼
LEAD CAPTURE (Verified Session & Token Generation)
   │
   ▼
DETERMINISTIC QUALIFICATION (100-Point Rule Engine)
   │
   ▼
CRM INGESTION (Status Pipeline & Score Badge)
   │
   ▼
AGENT ASSIGNMENT (Role-Based Isolation Guard)
   │
   ▼
APPOINTMENT BOOKING (Live Slots & Conflict Check)
   │
   ▼
TRANSACTIONAL NOTIFICATIONS (Email + WhatsApp)
   │
   ▼
COMMUNICATION AUDIT HISTORY (Immutable Activity Log)
```

---

## 5. Architecture & Technology Stack

*Full details available in [Architecture Overview](file:///Users/samarborairabbas/ai-real-estate-leads/docs/architecture-overview.md).*

* **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Vanilla CSS (Tokens & Design System).
* **Backend**: Next.js Server Components, API Route Handlers, Zod Validation.
* **Database & Auth**: Supabase Managed PostgreSQL 15+, Row-Level Security (RLS), Supabase Auth.
* **AI Layer**: Google GenAI SDK (`gemini-3.6-flash`), Server-side Function Calling / Tool Allowlisting.
* **Notifications**: Resend Transactional Email Engine, Twilio WhatsApp Messaging, Cron-based Reminder Processor.
* **Hosting**: Cloudflare Pages / Workers & OpenNext.

---

## 6. AI Strategy vs. Deterministic Business Logic

*Full details available in [AI Architecture](file:///Users/samarborairabbas/ai-real-estate-leads/docs/ai-architecture.md).*

A fundamental architectural principle of Aether Estates is **defensive separation of concerns**:
* **What AI Does**: Natural language dialogue, property query reformulation, context extraction, and friendly conversational summaries.
* **What AI NEVER Does**: The AI model is never allowed to assign lead scores, calculate qualification tiers, decide agent ownership, mutate database permissions, or execute arbitrary SQL.
* **Deterministic Qualification Engine**: A pure TypeScript scoring engine computes scores based on explicit user budget ranges (30 pts), timelines (30 pts), engagement depth (20 pts), and property fit (20 pts). If AI extracts a signal that conflicts with an explicit user form submission, user data strictly takes precedence.

---

## 7. Security Architecture & Controls

*Full details available in [Security Overview](file:///Users/samarborairabbas/ai-real-estate-leads/docs/security-overview.md).*

* **Row-Level Security (RLS)**: Enforced on all PostgreSQL tables. Agents can only view and update leads and appointments assigned directly to them. Super Admins possess global visibility.
* **Service-Role Isolation**: Administrative service-role keys are strictly server-side and never exposed to the client-side bundle or `NEXT_PUBLIC_*` environment variables.
* **IDOR & Mass-Assignment Protection**: All mutation endpoints validate ownership and ignore untrusted fields (e.g. `role`, `lead_score`, `created_at`).
* **Content Security Policy (CSP)**: Strict production headers with zero `'unsafe-eval'`, `X-Frame-Options: DENY`, and strict HTTPS referrer policies.

---

## 8. Appointment Engine & Conflict Handling

*Full details available in [Appointment Architecture](file:///Users/samarborairabbas/ai-real-estate-leads/docs/appointment-architecture.md).*

* **Timezone Standard**: All appointment slots and calendar queries are calculated and rendered in `America/Chicago` (Central Time) with ISO-8601 UTC database persistence.
* **Database Conflict Protection**: Double bookings are prevented at the application layer and enforced by database constraints.
* **Identity Preservation**: Rescheduling an appointment updates the existing record's `scheduled_at` timestamp and recalculates reminder schedules while preserving the original appointment ID, lead association, and historical audit trail.
* **Soft Cancellation**: Cancellations update status to `cancelled`, instantly freeing up the slot while preserving the record for historical reporting.

---

## 9. Transactional Communication & Reminder Engine

*Full details available in [Communication Architecture](file:///Users/samarborairabbas/ai-real-estate-leads/docs/communication-architecture.md).*

* **Channel Independence & Failure Isolation**: If WhatsApp delivery encounters a provider outage or missing opt-in, confirmation emails still send cleanly without failing the user request.
* **Persistent Reminder Scheduler**: 24-hour and 1-hour showing reminders are persisted as database records with atomic claiming (`UPDATE ... WHERE status = 'pending'`) to eliminate race conditions across multiple cron workers.
* **Explicit Opt-In Compliance**: WhatsApp messages are only dispatched to leads with verified consent. Unsubscribed leads log `status: skipped` with reason `NO_OPT_IN`.

---

## 10. Verification, Testing & QA Results

Every capability in Aether Estates is backed by automated tests verified against the live PostgreSQL test database:

| Test Suite / Phase | Scope | Tests Passed | Pass Rate |
|---|---|---|---|
| **Phase 4A** | Lead Qualification Engine | 13 / 13 | 100% ✅ |
| **Phase 4B** | CRM Dashboard & Pipeline | 15 / 15 | 100% ✅ |
| **Phase 4C** | Agent Assignment & Transcripts | 14 / 14 | 100% ✅ |
| **Phase 4D** | AI-Assisted Qualification | 12 / 12 | 100% ✅ |
| **Phase 5A** | Appointment Slot Engine & Booking | 15 / 15 | 100% ✅ |
| **Phase 5B** | Agent Calendar & Management | 18 / 18 | 100% ✅ |
| **Phase 5C** | Reschedule, Cancel & Conflicts | 19 / 19 | 100% ✅ |
| **Phase 6A** | Transactional Email Engine | 13 / 13 | 100% ✅ |
| **Phase 6B** | Reminder Automation & Cron | 21 / 21 | 100% ✅ |
| **Phase 6C** | WhatsApp Automation | 23 / 23 | 100% ✅ |
| **Phase 6D** | Communication Logs & Preferences | 25 / 25 | 100% ✅ |
| **Phase 7A** | Security Audit & CSP Hardening | 19 / 19 | 100% ✅ |
| **Phase 7B** | Production Smoke Test Suite | 16 / 16 | 100% ✅ |
| **Phase 7C** | Demo Experience & QA Suite | 12 / 12 | 100% ✅ |
| **GRAND TOTAL** | **Full Platform Regression** | **235 / 235** | **100% ✅** |

---

## 11. Known Limitations & Future Expansion

### Current Known Limitations
* **External Calendar Sync**: Appointments are managed within the internal CRM calendar; two-way sync with Google Calendar or Microsoft Outlook is not yet implemented.
* **Provider Webhooks**: Email and WhatsApp delivery tracking relies on provider response payloads; inbound webhook status receipts (e.g. `delivered`, `read`) are not active.
* **SMS Gateway**: Outbound messaging is dedicated to Email and WhatsApp; traditional SMS fallback is omitted.

### Future Roadmap
1. Two-way Google Calendar / Outlook integration via CalDAV/OAuth2.
2. Inbound webhook listeners for real-time delivery receipt updates.
3. Multi-brokerage multi-tenancy with custom domain branding.
