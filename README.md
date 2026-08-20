# Aether Estates

> **AI-Powered Real Estate Lead-to-Appointment Automation Platform**  
> Turn inbound property inquiries into qualified leads, agent assignments, appointments, reminders, and automated follow-up from one connected system.

---

## Live Demo & Showcase

* **Production URL**: Deployed on Netlify Edge CDN with live Supabase PostgreSQL backend.
* **Demo Environment**: Pre-seeded with 12 luxury properties, 10 fictional leads across HOT/WARM/COLD tiers, full AI chat transcripts, and appointments across life-cycle states.
* **Demo Walkthrough Guide**: See [`docs/demo-environment.md`](file:///Users/samarborairabbas/ai-real-estate-leads/docs/demo-environment.md) and [`docs/demo-script.md`](file:///Users/samarborairabbas/ai-real-estate-leads/docs/demo-script.md).

---

## What It Does

Aether Estates solves the lead drop-off problem in luxury real estate by replacing slow, manual lead forms with an **end-to-end automated pipeline**:
1. **Engages**: Inbound visitors chat with a 24/7 AI Concierge to discover luxury listings matching their location, budget, and style.
2. **Captures**: Prospect contact information and buying signals are captured conversationally within the chat stream.
3. **Qualifies**: A deterministic 100-point scoring engine transparently evaluates budget (30%), timeline (30%), engagement (20%), and property fit (20%) into `HOT`, `WARM`, and `COLD` tiers.
4. **Routes**: Leads are ingested into a secure CRM with role-based agent isolation, allowing admins to assign leads to licensed agents.
5. **Schedules**: Prospects and agents book 30-minute showings against live business-hour calendars protected by PostgreSQL conflict locks.
6. **Automates**: Dispatches branded transactional emails (Resend), WhatsApp alerts (Twilio), and scheduled 24h/1h showing reminders.
7. **Audits**: Logs all outbound messages in an immutable timeline respecting customer channel preferences and opt-outs.

---

## Core Features

* **AI Property Concierge**: Natural language discovery powered by Google Gemini (`gemini-3.6-flash`).
* **Tool-Calling Property Search**: Model executes server-side database filters via registered tools (`searchProperties`, `captureLeadInformation`).
* **Deterministic Lead Qualification**: Rule-based 100-point scoring algorithm decoupled from AI hallucinations.
* **Multi-Agent CRM**: Pipeline management with status stages (`new`, `qualifying`, `qualified`, `appointment_set`, `nurturing`, `closed`, `lost`).
* **Multi-Agent Data Isolation**: PostgreSQL Row-Level Security (RLS) ensures agents only access their assigned leads and schedules.
* **Appointment Engine**: Live 30-minute showing availability in Central Time (`America/Chicago`).
* **Conflict-Protected Booking**: Application-level and PostgreSQL constraint-level overlap prevention.
* **Identity-Preserving Reschedule**: Reschedules showings and recalculates reminder timers while maintaining historical audit integrity.
* **Transactional Email Automation**: Automated booking confirmations, reschedules, cancellations, and reminders via Resend.
* **WhatsApp Automation**: Business messaging via Twilio with explicit opt-in enforcement (`whatsapp_opt_in`).
* **Communication Audit Trail**: Centralized activity logs tracking status (`sent`, `skipped`, `failed`), templates, and error reasons.

---

## Technical Documentation Index

* 🏛️ **[Architecture Overview](file:///Users/samarborairabbas/ai-real-estate-leads/docs/architecture-overview.md)**: System topology, layers, and trust boundaries.
* 🤖 **[AI Architecture & Tool Calling](file:///Users/samarborairabbas/ai-real-estate-leads/docs/ai-architecture.md)**: Signal extraction, validation, and defensive AI engineering.
* 🛡️ **[Security Architecture & Controls](file:///Users/samarborairabbas/ai-real-estate-leads/docs/security-overview.md)**: RLS policies, IDOR protection, CSP headers, and secret isolation.
* 📅 **[Appointment Architecture](file:///Users/samarborairabbas/ai-real-estate-leads/docs/appointment-architecture.md)**: Slot generation, conflict prevention, and lifecycle state machine.
* 💬 **[Communication Architecture](file:///Users/samarborairabbas/ai-real-estate-leads/docs/communication-architecture.md)**: Notification router, failure isolation, and persistent reminder cron.
* 🧠 **[Engineering Decisions & Trade-Offs](file:///Users/samarborairabbas/ai-real-estate-leads/docs/engineering-decisions.md)**: 10 key architectural decisions and rationales.
* 🧩 **[Reusable Architecture Guide](file:///Users/samarborairabbas/ai-real-estate-leads/docs/reusable-architecture.md)**: Modular core vs domain adaptation patterns.
* 📖 **[Technical Case Study](file:///Users/samarborairabbas/ai-real-estate-leads/docs/case-study.md)**: Comprehensive business problem, technical solution, and outcomes.
* 📋 **[Client Capability Summary](file:///Users/samarborairabbas/ai-real-estate-leads/docs/client-capabilities.md)**: Executive feature sheet for clients and stakeholders.
* 🎬 **[Demo Presentation Script](file:///Users/samarborairabbas/ai-real-estate-leads/docs/demo-script.md)**: 2–3 minute structured client demonstration guide.
* 🧪 **[Testing & QA Overview](file:///Users/samarborairabbas/ai-real-estate-leads/docs/testing-overview.md)**: Phase-by-phase test matrix and verification methodology.

---

## Technology Stack

* **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Vanilla CSS Tokens & Responsive Design System.
* **Backend**: Next.js Server Components, API Route Handlers, Zod Validation Schemas.
* **Database & Auth**: Supabase Managed PostgreSQL 15+, Row-Level Security (RLS), Supabase Auth.
* **AI Layer**: Google GenAI SDK (`gemini-2.5-flash`), Server-Side Function Calling & Tool Allowlisting.
* **Email Provider**: Resend Transactional Email API (with development console fallback).
* **WhatsApp Provider**: Twilio WhatsApp Business API (with development console fallback).
* **Hosting & Infrastructure**: Netlify Edge Network & Serverless Next.js Runtime.

---

## Testing & Quality Assurance

The platform is verified with an automated test suite comprising **235 passed tests (100% pass rate)**:

```
▶ Phase 4A: Lead Qualification Engine ........... 13/13 PASS ✅
▶ Phase 4B: CRM Dashboard & Pipeline ............ 15/15 PASS ✅
▶ Phase 4C: Agent Assignment & Transcripts ...... 14/14 PASS ✅
▶ Phase 4D: AI-Assisted Qualification ........... 12/12 PASS ✅
▶ Phase 5A: Appointment Slot Engine ............ 15/15 PASS ✅
▶ Phase 5B: Calendar & Management .............. 18/18 PASS ✅
▶ Phase 5C: Reschedule, Cancel & Conflicts ...... 19/19 PASS ✅
▶ Phase 6A: Transactional Email Engine .......... 13/13 PASS ✅
▶ Phase 6B: Reminder Automation & Cron .......... 21/21 PASS ✅
▶ Phase 6C: WhatsApp Automation ................ 23/23 PASS ✅
▶ Phase 6D: Communication Logs & Preferences .... 25/25 PASS ✅
▶ Phase 7A: Security Audit & Hardening .......... 19/19 PASS ✅
▶ Phase 7B: Production Smoke Suite .............. 16/16 PASS ✅
▶ Phase 7C: Demo Experience QA Suite ............ 12/12 PASS ✅
─────────────────────────────────────────────────────────────
TOTAL: 235 / 235 Automated Tests Passing (100% ✅)
```

* **TypeScript Compilation**: `npm run typecheck` (`0 errors`).
* **ESLint Code Quality**: `npm run lint` (`0 errors, 0 warnings`).
* **Production Build**: `npm run build` (`33 routes compiled successfully`).

---

## Local Development & Setup

### Prerequisites
* Node.js 20+
* Supabase project or local PostgreSQL instance

### Quick Start
```bash
# 1. Clone repository
git clone https://github.com/your-username/aether-estates.git
cd aether-estates

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, and GEMINI_API_KEY

# 4. Seed demo environment (idempotent, safe)
npm run seed:demo

# 5. Start development server
npm run dev
```

### Running Tests
```bash
# Run Phase 7C QA suite
npx tsx --env-file=.env.local scripts/test-phase7c.ts

# Run Phase 7B Production Smoke suite
npx tsx --env-file=.env.local scripts/test-phase7b-production.ts

# Run complete platform regression suite (4A through 7C)
npm run typecheck && npm run lint && npm run build
```

---

## Known Limitations

* **External Calendar Sync**: Appointments are currently scheduled and managed within the internal CRM calendar; two-way sync with Google Calendar or Microsoft Outlook is not yet implemented.
* **Provider Inbound Webhooks**: Email and WhatsApp delivery tracking relies on synchronous API provider responses; inbound webhook receipt listeners (e.g. `delivered`, `read`) are not active.
* **SMS Messaging**: Mobile messaging is dedicated to WhatsApp Business; traditional carrier SMS is omitted.

---

## Future Improvements

* Two-way Google Calendar / Microsoft Outlook synchronization via CalDAV/OAuth2.
* Real-time delivery receipt webhooks for Resend and Twilio.
* Multi-brokerage multi-tenancy support with customizable agency branding.
* Native SMS fallback route for prospects without WhatsApp accounts.
