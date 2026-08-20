# Development phases

## Phase 1 — Foundation (Completed ✅)

Next.js app, Supabase Auth, `admin` / `agent` roles, protected `/admin` and `/dashboard`, core schema + RLS, Zod validation, env example, seed data, UI primitives, architecture docs.

---

## Phase 2 — Landing page + properties (Completed ✅)

Public luxury real-estate website for **Aether Estates** (*"Find a place that feels like home"*).
- Landing page (`/`), catalog (`/properties`), property details (`/properties/[id]`), multi-image gallery, specs, search/filtering, pagination, lead capture, SEO.
- Database migration `0002_phase2_public_properties_and_leads.sql`.

---

## Phase 3 — AI Chatbot (Completed ✅)

### Phase 3A — AI API + Basic Chat (Completed ✅)
- **AI Provider Abstraction**: `AIProvider` interface, `GeminiProvider` using `@google/genai`, and provider factory `getAIProvider()`.
- **System Instruction**: `AETHER_ESTATES_SYSTEM_PROMPT` tailored for luxury real-estate discovery.
- **Protected API Route**: `POST /api/chat` with Zod validation, bounded history, and rate limit error mapping.

### Phase 3B — `searchProperties()` Tool Calling (Completed ✅)
- **Tool Declaration & Validation**: Defined `searchProperties` tool with strict Zod validation schema.
- **Controlled Tool Dispatcher**: Single source of truth property query engine with `MAX_TOOL_ROUNDS = 2` loop protection.
- **Compact Property Results & UI Previews**: Formatted listing cards rendered inside chat messages with direct links.

### Phase 3C — Conversation Persistence + Lead Capture (Completed ✅)
- **Conversation & Message Persistence**: Storing sessions in `lead_conversations` and messages in `lead_messages` chronologically.
- **Anonymous Session Security**: Opaque 24-byte `access_token` isolating anonymous visitor chats.
- **Browser Refresh Rehydration**: `GET /api/chat/history` seamlessly restores messages and state upon reload.
- **Explicit Contact Confirmation**: Interactive `[Yes, connect me]` / `[Not now]` confirmation pills recording `lead_capture_confirmed_at` on the server before lead creation is permitted.
- **Lead Capture Tool (`captureLeadInformation`)**: Zod-validated tool routing qualified prospect details into `leads` with `source = 'chatbot'`.
- **Duplicate Prevention**: Updates existing linked leads in place on subsequent conversational edits rather than generating duplicate rows.
- **Database Migration**: `supabase/migrations/0003_phase3c_conversations_and_leads.sql`.

---

## Phase 4 — Lead Qualification & CRM

### Phase 4A — Lead Qualification Engine (Completed ✅)
- **Pure Deterministic Scoring Engine**: `calculateQualificationScore(input)` evaluates leads from 0 to 100 with zero LLM/AI dependency.
- **Four Core Components**: Budget Readiness (30 pts), Timeline Urgency (30 pts), Engagement Depth (20 pts), Property Fit (20 pts).
- **Qualification Categories**: `hot` (80–100), `warm` (50–79), `cold` (0–49).
- **Explainability**: Structured score breakdown and explicit reason strings.
- **Database Migration**: `supabase/migrations/0004_phase4a_qualification.sql`.
- **Automated Service Integration**: Real-time scoring triggers on chatbot lead capture and property page inquiry submission.

### Phase 4B — CRM Dashboard (Completed ✅)
- **Authenticated CRM Route**: `/dashboard/leads` protected via `requireStaff()` for Admins and Agents.
- **Live Summary Metrics**: Real-time aggregate counters for Total Leads, New Inquiries, Qualified Prospects, and Hot Buyers.
- **Dual Perspectives**: Kanban board (6 workflow columns) and sortable, paginated Table view.
- **Server-Side Querying**: Search (name, email, phone, location), status filter, qualification category filter, min budget, date range, and sorting allowlist.
- **Qualification Tooltip**: Visual badge displaying score and category with interactive 4-part breakdown meters and bulleted reasons.
- **Lead Detail Modal / Drawer**: Full prospect information, requirements, qualification analysis, and status changer.
- **Status Mutations**: Server-validated status transitions with optimistic UI feedback.
- **Database Migration**: `supabase/migrations/0005_phase4b_crm_agent_visibility.sql`.

### Phase 4C — Agent Assignment + Conversation Transcript (Completed ✅)
- **Multi-Tenant Authorization Model**: Admins have platform-wide access and assignment permissions; Agents are strictly restricted to leads assigned to them (`assigned_agent_id = profile.id`).
- **Interactive Agent Assignment & Reassignment**: Admin dropdown control with `POST /api/leads/[id]/assign` to assign, reassign, or unassign leads to the triage pool.
- **Agent Roster API**: Protected `GET /api/agents` endpoint returning assignable licensed agents.
- **Conversation Transcript Viewer**: Chronological dialog history viewer (`GET /api/leads/[id]/transcript`) with Visitor vs AI Concierge styling, formatted timestamps, and system token filtering.
- **Resource Hiding / Security**: Unauthorized lead and transcript requests return `404 Not Found` to prevent resource enumeration.
- **Database Migration**: `supabase/migrations/0006_phase4c_agent_assignment.sql` with non-recursive PostgreSQL RLS policies and performance indexes.
- **Runtime Verification**: 14/14 automated tests passed in `scripts/test-phase4c.ts`. Zero regression across Phases 4A and 4B.

### Phase 4D — AI-Assisted Qualification (Completed ✅)
- **Extraction & Enrichment Architecture**: Gemini extracts structured qualification signals (budget, timeline, property criteria, buyer intent) with normalized confidence (`0.0–1.0`) and concise evidence quotes.
- **Deterministic Engine Authority**: Phase 4A engine remains the sole authority for calculating `qualification_score`, `qualification_category`, `qualification_breakdown`, and `qualification_reasons`.
- **Precedence & Conflict Resolution**: Explicit user data > Existing CRM fields > AI extractions. Conflicts are surfaced in the CRM UI with quote evidence without overwriting.
- **Non-Conflicting Enrichments**: Discovered requirements can be applied to lead records, re-running the deterministic engine.
- **Prompt Injection Defense**: Untrusted conversation input cannot override extraction or scoring rules.
- **Database Migration**: `supabase/migrations/0007_phase4d_ai_qualification.sql`.
- **Runtime Verification**: 12/12 automated tests passed in `scripts/test-phase4d.ts`. Zero regression across Phases 4A, 4B, and 4C.

### Phase 5A — Availability & Booking Engine (Completed ✅)
- **Availability Engine**: Server-side slot generation with configurable working hours (09:00–17:00 CT), working days (Mon–Fri), and appointment duration.
- **Interval Overlap Logic**: Robust conflict detection filtering out conflicting candidate time ranges.
- **12-Step Booking Service**: Full validation pipeline ensuring lead ownership, agent assignment, non-past slots, and working-hour conformance.
- **Database-Level Double-Booking Prevention**: PostgreSQL `EXCLUDE` constraint with `btree_gist` extension prevents concurrent double-booking.
- **CRM Booking Panel**: Interactive date picker, server-fetched slot chips, appointment type selector, race condition handling (`409 Conflict`), and appointment history viewer.
- **Database Migration**: `supabase/migrations/0008_phase5a_appointments.sql`.
- **Runtime Verification**: 15/15 automated tests passed in `scripts/test-phase5a.ts`. Zero regression across Phases 4A, 4B, 4C, and 4D.

### Phase 5B — Agent Calendar & Appointment Management (Completed ✅)
- **Unified Appointment Workspace**: Authenticated operational calendar and paginated list views at `/dashboard/appointments`.
- **Day & Week Calendar Timeline**: Hourly Central Time (`America/Chicago`) timeline partitions with status indicators and prospect qualification badges.
- **Multi-Agent Scoping**: Agents see only their assigned appointments; Admins have global visibility with an agent filter. Unauthorized lookups return `404 Not Found`.
- **Canonical Status Transitions**: Validated forward transitions (`scheduled` → `confirmed` → `completed` / `no_show`). Terminal status integrity enforced.
- **Interactive Appointment Detail Modal**: Complete prospect, agent, property context, notes, and live status mutation actions.
- **Runtime Verification**: 18/18 automated tests passed in `scripts/test-phase5b.ts`. Zero regression across Phases 4A, 4B, 4C, 4D, and 5A.

### Phase 5C — Reschedule / Cancel + Conflict Handling (Completed ✅)
- **Appointment Identity Preservation**: In-place atomic reschedule updates (`scheduled_at`, `updated_at`) preserving ID, lead, agent, duration, and type.
- **Soft Cancellation**: Updates `status = 'cancelled'`, preserves relational history, and releases the time slot for new bookings.
- **Self-Excluding Conflict Validation**: Availability queries and conflict checks explicitly exclude the appointment being updated.
- **Database-Level Race Protection**: PostgreSQL `EXCLUDE` constraint catches concurrent overlaps and returns `409 Conflict`.
- **Integrated Detail Modal Workflows**: Seamless date selection, server slot fetching, comparison review, two-step cancellation confirmation, and direct CRM links.
- **Runtime Verification**: 19/19 automated tests passed in `scripts/test-phase5c.ts`. Zero regression across Phases 4A, 4B, 4C, 4D, 5A, and 5B.

---

## Phase 6 — Notifications & Communication Engine

### Phase 6A — Email Automation Engine (Completed ✅)
- **Decoupled Event Architecture**: Domain events (`appointment.created`, `appointment.rescheduled`, `appointment.cancelled`) dispatched as non-blocking side effects.
- **Provider Abstraction**: `EmailProvider` interface supporting production Resend REST integration and a DevLog/Mock provider for testing/local preview.
- **Event Idempotency**: In-memory event deduplication keyed on `${eventType}:${appointmentId}:${version}` preventing duplicate transactional emails.
- **Branded Luxury Templates**: Full HTML and plain-text templates for customer confirmations and agent notifications with Central Time formatting and CRM links.
- **Zero Business Rollback**: Email transport errors are caught and logged without failing core appointment mutations.
- **Runtime Verification**: 13/13 automated tests passed in `scripts/test-phase6a.ts`. Zero regression across Phases 4A, 4B, 4C, 4D, 5A, 5B, and 5C.

### Phase 6B — Appointment Reminder Automation (Completed ✅)
- **Persistent Idempotency**: PostgreSQL table `appointment_reminders` with `UNIQUE(appointment_id, reminder_type)` constraint and due index `(status, scheduled_for)`.
- **Atomic Concurrency Protection**: Compare-and-set claiming (`status = 'pending' -> 'processing'`) preventing duplicate reminder dispatches during concurrent scheduler runs.
- **Dynamic State Evaluation**: Reminders dynamically validate live appointment state; rescheduled appointments recalculate their schedules, while cancelled, completed, and no-show appointments are marked `skipped`.
- **Bounded Retry Policy**: Maximum 3 attempts on email provider transport errors.
- **Luxury Reminder Templates**: Branded HTML and plain-text reminder templates (24h and 1h) with Central Time formatting and CRM links.
- **Protected Scheduler Endpoint**: `POST /api/cron/appointment-reminders` secured with `CRON_SECRET` header and Admin staff session fallback.

### Phase 6C — WhatsApp Automation (Completed ✅)
- **Multi-Channel Notification Router**: Extends domain event notifications with parallel, independent **Email** and **WhatsApp** channels.
- **Provider Abstraction**: `WhatsAppProvider` interface implemented with `TwilioWhatsAppProvider` (production REST client) and `DevLogWhatsAppProvider` (dev console preview & mock tester).
- **Server-Side E.164 Validation**: `normalizePhoneNumber` cleans and enforces standard international E.164 formatting (`+1XXXXXXXXXX`).
- **Explicit Application-Controlled Consent**: Database-backed opt-in (`leads.whatsapp_opt_in`). Strict policy: valid phone + stored opt-in required before customer WhatsApp dispatch; AI cannot grant consent.
- **Separate Recipient Policies**: Separate rules for prospective customer leads (opt-in mandatory) and agents (active staff notification preference).
- **Branded Luxury Templates**: Structured WhatsApp mobile templates for appointment creation, rescheduling, cancellation, and 24h/1h reminders.
- **Protected Opt-In Endpoint**: `POST /api/leads/[id]/whatsapp-opt-in` with staff authorization and public conversation access token support.
- **Strict Channel Failure Isolation**: Email failure never affects WhatsApp; WhatsApp failure never affects Email or core booking workflows.
- **Runtime Verification**: 23/23 automated tests passed in `scripts/test-phase6c.ts`. Zero regression across Phases 4A through 6B (163/163 total passing).

### Phase 6D — Communication Logs & Preferences (Completed ✅)
- **Centralized Communication Logs**: PostgreSQL `communication_logs` table tracking outcomes (`sent`, `skipped`, `failed`, `pending`) for all notification events across Email and WhatsApp.
- **Strict Separation of Concerns**: Preferences dictate *eligibility* ("What are we allowed to send?"); Router decides *channel delivery*; Logs record *outcomes* ("What actually happened?").
- **Multi-Agent RLS & Security**: Admins retain global log access; Agents can only view logs for assigned prospects; Anonymous and cross-agent access strictly blocked.
- **CRM Integration**:
  - `CommunicationPreferences` toggle component for transactional email and WhatsApp opt-in.
  - `CommunicationHistory` chronological timeline (newest first) with Channel filtering (All / Email / WhatsApp), Status filtering (All / Sent / Skipped / Failed), expandable safe metadata preview, and server-side pagination.
- **Data Minimization & Privacy**: Normalized template names, sanitized error codes, and safe metadata without dumping raw provider payloads or storing full message bodies.
- **Runtime Verification**: 25/25 automated tests passed in `scripts/test-phase6d.ts`. Zero regression across Phases 4A through 6C (188/188 total passing).

---

## Phase 7 — Production Hardening, Showcase & Deployment

```text
7A — Production Hardening + Security Audit   ✅ (Completed)
7B — Deployment + Monitoring + Performance   ✅ (Completed)
7C — Demo Experience + Seed Data + QA        ✅ (Completed)
7D — Portfolio + Case Study + Showcase       (Upcoming)
```

### Phase 7C — Demo Experience + Seed Data + QA (Completed ✅)
- **Deterministic Fictional Dataset**: Created idempotent `scripts/seed-demo.ts` seeding 16 luxury properties, 10 balanced leads (HOT/WARM/COLD), realistic AI chat dialogues, life-cycle appointments, and communication logs.
- **Safe Reset Utility**: Created `scripts/reset-demo.ts` for safe cleanup of demo-tagged records without touching real customer data.
- **Demo Accounts & Guide**: Documented demo staff roles (`admin@demo.aether.test`, `alex.agent@demo.aether.test`, `taylor.agent@demo.aether.test`) and the 2–3 minute primary client demo journey in [`docs/demo-environment.md`](file:///Users/samarborairabbas/ai-real-estate-leads/docs/demo-environment.md).
- **Notification Safety**: Seed operations bypass transactional dispatch to prevent accidental external email/WhatsApp alerts.
- **Automated QA Test Suite**: 12/12 passing tests in `scripts/test-phase7c.ts`.


### Phase 7A — Production Hardening & Security Audit (Completed ✅)
- **Zero Browser Authority**: All authorization, scoring, lead ownership, and notification recipient decisions enforced server-side.
- **Production Provider Hardening**: Real provider enforcement (`ResendEmailProvider`, `TwilioWhatsAppProvider`) in production; zero silent mock fallbacks.
- **Cron Security**: Strict `CRON_SECRET` authentication for `/api/cron/appointment-reminders` (development fallbacks restricted to non-production).
- **Web Security Headers & CSP**: Enforced `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `X-DNS-Prefetch-Control: off`.
- **Data Minimization & Sanitization**: Phone numbers masked in logs, Zod schema mass-assignment guards, zero secret leakage in logs or client bundles.
- **Security Audit & Readiness Reports**: Created [`docs/security-audit.md`](file:///Users/samarborairabbas/ai-real-estate-leads/docs/security-audit.md) and [`docs/production-readiness.md`](file:///Users/samarborairabbas/ai-real-estate-leads/docs/production-readiness.md).
- **Automated Security Test Suite**: 19/19 passing tests in `scripts/test-phase7a-security.ts`.
- **Full Regression**: 207/207 tests passing across all suites.

### Phase 7B — Deployment + Monitoring + Performance (Completed ✅)
- **Deployment Topology Documentation**: Created [`docs/production-architecture.md`](file:///Users/samarborairabbas/ai-real-estate-leads/docs/production-architecture.md) detailing edge hosting, serverless execution, and managed Supabase PostgreSQL.
- **Health Check Enhancement**: Upgraded `GET /api/health` to diagnose live database connectivity and multi-provider readiness without credential exposure.
- **Query & Database Performance Audit**: Verified batched `.in()` queries eliminating N+1 lookups; verified database indexes on leads, appointments, and communication logs.
- **Operational Readiness Evaluation**: Updated [`docs/production-readiness.md`](file:///Users/samarborairabbas/ai-real-estate-leads/docs/production-readiness.md) across 14 categories.
- **Automated Production Smoke Test Suite**: 16/16 passing tests in `scripts/test-phase7b-production.ts`.
- **Full Regression Suite**: 223/223 total passing tests across all platforms and test suites.

---

## Phase 8 — Advanced Scaling & Deployment (Upcoming)
Automated tests, threat review, production env, CI.
