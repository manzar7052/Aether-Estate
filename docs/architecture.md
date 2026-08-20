# Architecture

The system is designed as a **modular monolith** using Next.js (App Router), PostgreSQL (Supabase), TypeScript, and Gemini AI.

```text
Visitor / Public UI (Landing, Properties, Persistent Chat Widget)
   ↓
Authenticated Staff Portal (`/dashboard`, `/dashboard/leads`)
   ↓
API / Server Layer (Server Components, Server Actions, Route Handlers)
   ↓
Business Services (`src/services/{properties, leads, qualification, ai}`)
   ↓
Deterministic Qualification Engine (`src/services/qualification/scoring.ts`)
   ↓
PostgreSQL Database (Supabase)
```

---

## Layers

### 1. Frontend & Public UI (Phase 2, 3A, 3B & 3C)

- **Homepage (`/`)**: High-converting luxury landing page with Brand *Aether Estates*, Hero Quick Finder, Featured Properties Showcase, Value Pillars, Process Steps, Featured Markets, and Lead CTA Banner.
- **Properties Discovery (`/properties`)**: Responsive multi-filter catalog supporting Location search, Property Type, Budget Min/Max, Bedrooms, Status, Sorting (`recommended`, `price_asc`, `price_desc`, `newest`), and database-level Pagination.
- **Property Detail (`/properties/[id]`)**: Full listing presentation with multi-photo interactive gallery, lightbox viewer, key specs ribbon, detailed architectural copy, amenities tags, sticky lead capture sidebar, and similar listings in the same market.
- **Persistent Chat Concierge (`src/components/chat/chat-widget.tsx`)**: Luxury floating real-estate discovery concierge featuring session persistence, refresh rehydration, property cards, and application-verified consent capture.

---

### 2. Phase 4A — Lead Qualification Engine

- Pure, deterministic scoring engine (`calculateQualificationScore`) scoring leads from 0 to 100 with zero LLM/AI dependency.
- Evaluates 4 distinct dimensions: Budget Readiness (30), Timeline Urgency (30), Engagement Depth (20), and Property Fit (20).
- Categorizes prospects into `hot` (80–100), `warm` (50–79), and `cold` (0–49) with explainable reasons.

---

### 3. Phase 4B — CRM Dashboard Architecture

```text
                        AUTHENTICATED STAFF
                          (Admin / Agent)
                                │
                                ▼
                       /dashboard/leads
         (Server Component with validated searchParams)
                                │
         ┌──────────────────────┴──────────────────────┐
         ▼                                             ▼
getCRMSummaryMetrics()                           getCRMLeads(params)
         │                                             │
         ▼                                             ▼
   Supabase Database                             Supabase Database
(Aggregates via RLS)                        (Filtered, Sorted, Paginated)
         │                                             │
         └──────────────────────┬──────────────────────┘
                                │
                                ▼
                        CRMClient Wrapper
         ┌──────────────────────┴──────────────────────┐
         ▼                                             ▼
    Kanban View                                   Table View
(6 Status Columns)                           (Sortable Table)
         │                                             │
         └──────────────────────┬──────────────────────┘
                                │
                                ▼
                 Lead Detail Modal / Drawer
           (Prospect Info, Score Breakdown, Reasons,
             Status Changer, Transcript Placeholder)
                                │
                                ▼ (Status Update Action)
                  updateLeadStatus(leadId, status)
```

#### Key Architecture Principles:
1. **Server-Driven Querying & Pagination**: All search queries, status filters, qualification filters, budget filters, date ranges, and sorting are executed in PostgreSQL on the server with bounded page ranges.
2. **Dual Interactive Perspectives**:
   - **Kanban Board**: 6 columns mapping workflow stages (`New`, `Contacted`, `Qualified`, `Nurture`, `Appt Set`, `Closed`, `Archived`) with compact cards.
   - **Table View**: Responsive data table with inline status changers and detailed prospect metrics.
3. **Qualification Transparency**: Visual badges (`HOT · 92`, `WARM · 62`, `COLD · 25`) with interactive popovers showing the 4-part breakdown meters and bulleted reasons.
4. **Controlled Status Mutations**: Status transitions execute through validated server endpoints with optimistic UI updates and error rollback.
5. **Authorization & Interim Visibility Model**: Protected via `requireStaff()` (admins and agents). In Phase 4B, all staff can view and manage leads prior to Phase 4C assignment workflows.

---

---

### 4. Phase 4C — Agent Assignment & Conversation Transcript Architecture

```text
               ADMINISTRATOR                                  LICENSED AGENT
                     │                                              │
                     ▼                                              ▼
        /dashboard/leads (Global)                     /dashboard/leads (Scoped)
  (All Leads + Unassigned Triage Pool)          (Strictly assigned_agent_id = profile.id)
                     │                                              │
         ┌───────────┴───────────┐                                  │
         │                       │                                  │
         ▼                       ▼                                  ▼
[Assign / Reassign]     [Inspect Transcript]              [Inspect Transcript]
 POST /api/leads/        GET /api/leads/                   GET /api/leads/
   [id]/assign             [id]/transcript                   [id]/transcript
```

#### Key Architecture Principles:
1. **Multi-Tenant Agent Authorization**:
   - **Admins** have global visibility across all leads (assigned and unassigned), can filter by agent, and can assign/reassign/unassign leads.
   - **Agents** are restricted strictly to leads where `assigned_agent_id = profile.id` at both the database RLS layer and server service query layer. Inaccessible leads return `404 Not Found` (resource hiding) to prevent enumeration.
2. **Interactive Assignment & Reassignment**:
   - Admins can assign leads to licensed agents (`role = 'agent'`) or unassign them back to the triage pool via `POST /api/leads/[id]/assign`.
   - Reassignment immediately transfers access: the previous agent loses visibility and the new agent gains visibility instantly.
3. **Conversation Transcript Viewer**:
   - Chronological message history (`lead_messages` ordered `created_at ASC`) rendered with distinct styling for Visitor vs AI Concierge.
   - System markers (such as tokens and consent markers) are filtered out, returning clean user-facing dialogue.
   - Leads captured without chatbot interactions return a clean empty state.

---

### 5. Phase 4D — AI-Assisted Qualification Architecture

```text
              CONVERSATION & LEAD RECORD
                          │
                          ▼
                 GEMINI EXTRACTION
          (Structured Signals + Evidence Quotes)
                          │
                          ▼
                  SCHEMA VALIDATION
               (Zod Confidence & Enums)
                          │
                          ▼
              CONFLICT & PRECEDENCE LAYER
        (User Explicit Data > CRM Fields > AI)
                          │
                          ▼
            DETERMINISTIC QUALIFICATION
             (Phase 4A Scoring Engine)
                          │
                          ▼
                   AUTHORITATIVE
                SCORE / CATEGORY
               (HOT / WARM / COLD)
                          │
                          ▼
                    CRM DASHBOARD
```

#### Key Architecture Principles:
1. **AI as Extraction & Enrichment Layer**: Gemini interprets conversational dialogue and prospect inquiries to extract structured signals (budget, timeline, property fit, buyer intent) with normalized confidence (`0.0–1.0`) and concise verbatim evidence quotes.
2. **Deterministic Score Authority**: Gemini **NEVER** calculates the final score or assigns the HOT/WARM/COLD category. Any score returned by AI is discarded; the Phase 4A deterministic engine is the sole source of truth.
3. **Data Precedence & Conflict Resolution**:
   - Explicit user-provided data > Authoritative CRM fields > AI extractions.
   - Detected conflicts are surfaced in the CRM UI with quote evidence without silently overwriting authoritative fields.
4. **Controlled Enrichment**: Non-conflicting discovered criteria (e.g. newly stated target timeline or location) can be applied to the lead record, triggering an authoritative re-qualification via the deterministic engine.
5. **Prompt Injection Defense**: Conversation content is treated strictly as untrusted data; system prompts instruct the model to disregard embedded commands or override attempts.

---

---

### 6. Phase 5A — Appointment Booking Architecture

```text
       LEAD DETAIL MODAL
               │
               ▼
      SELECT DATE (Weekday)
               │
               ▼
    GET /api/appointments/
         availability
               │
               ▼
    SERVER AVAILABILITY ENGINE
  (Working Hours: 09:00–17:00 CT)
               │
               ▼
    INTERVAL CONFLICT FILTER
  (Exclude existing booked slots)
               │
               ▼
     SELECT AVAILABLE SLOT
               │
               ▼
    POST /api/appointments
               │
               ▼
   12-STEP SERVER VALIDATION
 (Auth + Lead + Agent + Time + Scope)
               │
               ▼
  POSTGRESQL EXCLUDE CONSTRAINT
    (Double-booking prevention)
               │
               ▼
      APPOINTMENT CREATED
               │
               ▼
   CONFIRMATION IN CRM UI
```

#### Key Architecture Principles:
1. **Derived Availability & Revalidation**:
   - Client-side slot display is strictly candidate data.
   - Availability is revalidated server-side at booking time; stale client selections fail with `409 Conflict` and prompt a refresh.
2. **Timezone Model**:
   - Business operations use `America/Chicago` (Central Time) matching the Texas luxury market.
   - Database stores all timestamps as UTC (`timestamptz`).
3. **Database-Level Conflict Protection**:
   - PostgreSQL `EXCLUDE` constraint with `btree_gist` prevents overlapping time ranges for the same agent (`tstzrange` with `&&`).
4. **Lead & Appointment Separation**:
   - `lead.status` (`new`, `qualifying`, `qualified`, `nurturing`, `appointment_set`, `closed`, `lost`) is decoupled from `appointment.status` (`scheduled`, `confirmed`, `completed`, `cancelled`, `no_show`).
5. **Multi-Agent Authorization**:
   - Admins can book for any authorized lead.
   - Agents can only book appointments for leads assigned to them (`assigned_agent_id = profile.id`).
   - Anonymous requests to booking and availability routes are blocked with `401 Unauthorized`.

---

### 7. Phase 5B — Agent Calendar & Appointment Management Architecture

```text
       AUTHENTICATED USER (Agent / Admin)
                      │
                      ▼
            GET /api/appointments
                      │
                      ▼
             AUTHORIZATION SCOPE
  (Agent: agent_id = profile.id; Admin: global / filtered)
                      │
                      ▼
         DATE / STATUS / SORT FILTERS
     (Central Time boundary: America/Chicago)
                      │
                      ▼
          SERVER-SIDE AGGREGATION
    (Enriched with Prospect & Agent Context)
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
     CALENDAR VIEW           LIST VIEW
   (Day / Week Timeline)   (Paginated Table)
           │                     │
           └──────────┬──────────┘
                      ▼
           APPOINTMENT DETAIL MODAL
                      │
                      ▼
          STATUS TRANSITION MUTATION
  (scheduled -> confirmed -> completed / no_show)
```

#### Key Architecture Principles:
1. **Operational Workspace Layer**:
   - The calendar and list views operate on server-side queries strictly scoped by user role.
   - The appointment database and authorization layer remain authoritative; the calendar does not duplicate or override booking logic.
2. **Multi-Agent Scoping**:
   - **Agents** can only view and manage appointments where `agent_id = profile.id`.
   - Client-provided `?agentId=...` query parameters are ignored for agents.
   - Unauthorized lookups return `404 Not Found` (resource hiding).
   - **Admins** have global visibility and can filter by specific agents.
3. **Canonical Status Transitions**:
   - Supported forward operational transitions:
     - `scheduled` → `confirmed` | `cancelled`
     - `confirmed` → `completed` | `no_show` | `cancelled`
4. **Timezone Uniformity**:
   - All calendar slot alignments, day/week partitions, and formatted displays use `America/Chicago` (Central Time).

---

### 8. Phase 5C — Appointment Lifecycle (Reschedule & Cancellation) Architecture

```text
               RESCHEDULE MUTATION
       (PATCH /api/appointments/[id]/reschedule)
                        │
                        ▼
             AUTHORIZATION VALIDATION
        (Agent: agent_id = profile.id; Admin: all)
                        │
                        ▼
             ACTIVE STATUS VALIDATION
      (Only 'scheduled' and 'confirmed' allowed)
                        │
                        ▼
          TARGET DATETIME & HOURS CHECK
        (Future Mon-Fri, 09:00-17:00 Central)
                        │
                        ▼
             INTERVAL CONFLICT CHECK
           (Excludes appointment itself)
                        │
                        ▼
            ATOMIC DATABASE UPDATE
      (EXCLUDE constraint checks race conditions)
                        │
                        ▼
      APPOINTMENT IDENTITY FULLY PRESERVED
    (id, lead_id, agent_id, created_at unchanged)
                        │
                        ▼
               CALENDAR UI REFRESHED


              CANCELLATION MUTATION
         (PATCH /api/appointments/[id]/cancel)
                        │
                        ▼
             AUTHORIZATION VALIDATION
                        │
                        ▼
             ACTIVE STATUS VALIDATION
                        │
                        ▼
             SOFT-STATE UPDATE
               status = 'cancelled'
                        │
                        ▼
       HISTORICAL RECORD PRESERVED IN DB
                        │
                        ▼
         TIME SLOT FREED FOR RE-BOOKING
```

#### Key Architecture Principles:
1. **Appointment Identity Preservation**:
   - **Rescheduling** does NOT delete or recreate appointments (`cancel + book`). It updates the existing row (`scheduled_at`, `updated_at`), preserving `appointment.id`, `lead_id`, `agent_id`, `created_at`, `duration_minutes`, and `type`.
   - **Cancellation** uses soft state (`status = 'cancelled'`), preserving all prospect and agent relational history while immediately freeing the candidate time slot for new bookings.
2. **Self-Exclusion in Conflict Checks**:
   - Reschedule availability and overlap verification explicitly filters out the appointment being modified (`id != appointment.id`).
3. **Database-Level Exclusion Constraint**:
   - Concurrent race conditions during rescheduling are trapped by PostgreSQL's `EXCLUDE` constraint on `(agent_id WITH =, tstzrange(...) WITH &&) WHERE (status != 'cancelled')`, returning a controlled `409 Conflict`.
4. **Status Workflow Integrity**:
   - Only active appointments (`scheduled`, `confirmed`) can be rescheduled or cancelled.
   - Terminal appointments (`completed`, `no_show`, `cancelled`) reject modification attempts with controlled error responses.
   - Rescheduling maintains current status (a `confirmed` appointment stays `confirmed`).

---

### 9. Phase 6A — Email Automation Architecture

```text
       BUSINESS MUTATION (Create / Reschedule / Cancel)
                             │
                             ▼
                  DATABASE TRANSACTION COMMIT
                             │
                             ▼
                    DOMAIN EVENT EMISSION
     (appointment.created | rescheduled | cancelled)
                             │
                             ▼
                CENTRAL NOTIFICATION HANDLER
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
    IDEMPOTENCY GUARD                DATA ENRICHMENT
  (Keyed on event:appt:ver)        (Prospect, Agent, Property)
            │                                 │
            └────────────────┬────────────────┘
                             ▼
                   EMAIL TEMPLATE ENGINE
               (Branded HTML + Plain-Text)
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
     CUSTOMER RECIPIENT                AGENT RECIPIENT
      (lead.email)                      (agent.email)
            │                                 │
            └────────────────┬────────────────┘
                             ▼
                   EMAIL PROVIDER ROUTER
            (Resend in Prod / DevLog in Dev & Test)
                             │
                             ▼
                    TRANSACTIONAL DISPATCH
       (Non-blocking; failures logged without rollback)
```

#### Key Architecture Principles:
1. **Decoupled Side Effect**:
   - Email dispatch is strictly an asynchronous side effect of a committed business event.
   - Failures in email transport NEVER fail or roll back the core appointment transaction.
2. **Provider Abstraction**:
   - `EmailProvider` interface cleanly isolates business logic from third-party vendor SDKs.
   - `ResendEmailProvider` serves production traffic via native REST (`https://api.resend.com/emails`).
   - `DevLogEmailProvider` provides safe terminal preview logging and mock capture for testing.
3. **Event Idempotency**:
   - In-memory event deduplication guard keyed on `${eventType}:${appointmentId}:${version}` prevents duplicate sends during concurrent or repeated triggers.
4. **Verified Recipients & XSS Neutralization**:
   - Recipient addresses are strictly resolved from authoritative database records (`lead.email`, `agent.email`).
   - All user-supplied strings are sanitized with `escapeHtml` before interpolation into HTML templates.
5. **Timezone Uniformity**:
   - All email notifications format timestamps uniformly in `America/Chicago` (Central Time).

---

### 10. Phase 6B — Appointment Reminder Architecture

```text
               SCHEDULED CRON TRIGGER (Vercel Cron / Scheduled Endpoint)
                                           │
                                           ▼
                       DUE REMINDER DATABASE QUERY
                 (WHERE status = 'pending' AND scheduled_for <= now())
                                           │
                                           ▼
                       PERSISTENT ATOMIC CLAIM
                   (UPDATE status = 'processing' WHERE id = :id)
                                           │
                                           ▼
                   CURRENT APPOINTMENT VALIDATION
                     - Live appointment status active (scheduled/confirmed)
                     - Live appointment timestamp matches schedule
                     - If cancelled/completed/no-show -> status = 'skipped'
                     - If drift > 5 min -> realign or skip
                                           │
                                           ▼
                            NOTIFICATION EVENT
                (appointment.reminder_24h | appointment.reminder_1h)
                                           │
                                           ▼
                         PHASE 6A EMAIL ENGINE
                       (DevLog / Resend Provider)
                                           │
                                           ▼
                      PERSISTENT REMINDER RESULT
                - Success: status = 'sent', processed_at = now()
                - Failure: attempts++, if attempts < 3 status = 'pending' else 'failed'
```

#### Key Architecture Principles:
1. **Persistent State & Deduplication Authority**:
   - `appointment_reminders` table in PostgreSQL with `UNIQUE(appointment_id, reminder_type)` guarantees deduplication survives restarts, deployments, and distributed server processes.
2. **Atomic Concurrency Protection**:
   - Competing cron executions atomically claim pending reminders (`UPDATE ... SET status = 'processing' WHERE id = :id AND status = 'pending'`), guaranteeing zero duplicate sends.
3. **Dynamic State Precedence**:
   - Reminders are calculated and validated from the live, authoritative appointment state at runtime. Rescheduled appointments recalculate their schedules; cancelled, completed, or no-show appointments are safely marked `skipped`.
4. **Bounded Retry Policy**:
   - Network or provider errors retry up to 3 times before marking `failed`. Underlying appointments remain unchanged.
5. **Timezone Uniformity**:
   - Reminder offsets (`24h` = 1440 min, `1h` = 60 min) format dates and times explicitly in `America/Chicago` (Central Time).

---

### 11. Phase 6C — WhatsApp Automation Architecture

```text
Domain Event (appointment.created / rescheduled / cancelled / reminder_24h / reminder_1h)
                                 │
                                 ▼
                     Notification Handler
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
   Email Channel                                  WhatsApp Channel
 (Customer & Agent)                             (Customer & Agent)
         │                                               │
         │                                    ┌──────────┴──────────┐
         │                                    ▼                     ▼
         ▼                          Phone Normalization      Explicit Opt-In
   Resend / DevLog                     (E.164 Standard)     (Database-Backed)
                                              │                     │
                                              └──────────┬──────────┘
                                                         ▼
                                                WhatsApp Provider
                                            (Twilio REST / DevLog Mock)
```

#### Key Architecture Principles:
1. **Multi-Channel Router**:
   - `emitNotificationEvent` evaluates and dispatches notifications across both Email and WhatsApp channels as parallel, independent side effects.
2. **Provider Abstraction**:
   - `WhatsAppProvider` interface decouples notification orchestration from SMS/WhatsApp providers (`TwilioWhatsAppProvider` in production, `DevLogWhatsAppProvider` in dev/test).
3. **Server-Side Phone Normalization & Validation**:
   - All destination phone numbers pass through `normalizePhoneNumber()`, enforcing strict E.164 formatting (`+1XXXXXXXXXX`) and rejecting malformed numbers without consuming provider API requests.
4. **Explicit Application-Controlled Consent**:
   - Customer leads require database-backed opt-in (`leads.whatsapp_opt_in = true`). AI/Gemini can never grant consent. Consent is managed strictly via server-side application logic and the protected endpoint `POST /api/leads/[id]/whatsapp-opt-in`.
5. **Strict Channel Failure Isolation**:
   - WhatsApp failures never roll back Email dispatches or appointment mutations; Email failures never affect WhatsApp.

---

---

### 12. Phase 6D — Communication Logs & Preference Architecture

```text
Business Event (created / rescheduled / cancelled / reminder_24h / reminder_1h)
                                 │
                                 ▼
                    Notification Event Router
                                 │
       ┌─────────────────────────┴─────────────────────────┐
       ▼                                                   ▼
Channel Eligibility (Preferences)                 Channel Eligibility (Preferences)
- Email: Transactional Enabled                    - WhatsApp: Explicit Opt-In Stored
       │                                                   │
       ▼                                                   ▼
 Email Dispatch                                    WhatsApp Dispatch
(Customer & Agent)                                (Customer & Agent)
       │                                                   │
       └─────────────────────────┬─────────────────────────┘
                                 │
                                 ▼
                     Communication Log Service
                  (`public.communication_logs`)
        - Records granular outcome: 'sent', 'skipped', 'failed'
        - Sanitized error codes, timestamps & template IDs
        - Multi-agent RLS protection & audit immutability
```

#### Key Architecture Principles:
1. **Separation of Preferences vs Logs**:
   - **Preferences** (`leads.whatsapp_opt_in`, `leads.email_transactional_opt_in`) control *eligibility* ("What are we allowed to send?").
   - **Communication Logs** (`public.communication_logs`) record *outcomes* ("What actually happened?").
   - Preference mutations update future delivery rules without altering or deleting historical log records.
2. **Channel-Independent Auditability**:
   - Every delivery attempt (Email / WhatsApp, Customer / Agent) produces an independent log entry, ensuring partial deliveries (e.g. email sent, WhatsApp failed) are transparently recorded.
3. **Data Minimization & Privacy**:
   - Stores structured metadata, normalized template names, and sanitized error codes without dumping raw provider payloads or storing complete message bodies.
4. **CRM Integration**:
   - Compact preferences toggle and chronological communication timeline with filtering (All / Email / WhatsApp, Sent / Skipped / Failed) and server-side pagination embedded in the Lead Detail view.

---

### 13. Database & Row Level Security (RLS)

- Schema migrations:
  - `0001_init.sql` (Core foundation)
  - `0002_phase2_public_properties_and_leads.sql` (Public properties & lead inquiries)
  - `0003_phase3c_conversations_and_leads.sql` (Nullable `lead_id`, `access_token`, `lead_capture_confirmed_at`)
  - `0004_phase4a_qualification.sql` (Qualification category, breakdown, reasons, qualified_at)
  - `0005_phase4b_crm_agent_visibility.sql` (Interim shared-pool CRM access policies)
  - `0006_phase4c_agent_assignment.sql` (Multi-agent assignment scoping & transcript RLS)
  - `0007_phase4d_ai_qualification.sql` (AI qualification signals, model, and timestamp)
  - `0008_phase5a_appointments.sql` (Duration, type, EXCLUDE constraint, and appointment RLS)
  - `0009_phase6b_appointment_reminders.sql` (Appointment reminders table, uniqueness, status index, and RLS)
  - `0010_phase6c_whatsapp.sql` (WhatsApp consent columns on leads, staff notification preferences on profiles, index)
  - `0011_phase6d_communication_layer.sql` (Communication logs table, ENUMs, transactional email preference, indexes, and RLS)
- **Leads, Transcripts & Appointments Security**:
  - Direct public access to `leads`, `lead_conversations`, `lead_messages`, `appointments`, `appointment_reminders`, and `communication_logs` is strictly denied.
  - Agents can only select/update leads and appointments assigned to them (`assigned_agent_id = current_profile_id()`).
  - Agents can only select communication logs for assigned leads or appointments.
---

### 14. Phase 7A — Production Hardening & Security Architecture

```text
Browser Client
     │  (Protected with X-Frame-Options: DENY, nosniff, strict-origin)
     ▼
Next.js Edge / Server Routes
     │  (Zod Payload Validation, Stripping Unpermitted Mass Assignment Fields)
     ▼
Server Authorization Layer (`requireApiStaff` / `requireApiAdmin` / `requireStaff`)
     │  (Enforces Agent ID scoping; returns 404 on unassigned resources)
     ▼
Core Business Services (Deterministic Logic, Conflict Checking, Notification Router)
     │  (No Direct Model Access to Database; Tool allowlisting enforced)
     ▼
PostgreSQL / Supabase + Row Level Security (RLS) + Exclusion Constraints
```

#### Production Security Tenets:
1. **Zero Browser Authority**:
   - The browser and client are never authoritative for permissions, lead assignment, qualification scores, appointment ownership, or provider credentials.
2. **Strict Production Provider Selection**:
   - In `NODE_ENV === "production"`, notification factories strictly resolve real production providers (`ResendEmailProvider`, `TwilioWhatsAppProvider`). Mock providers (`dev-logger`) are strictly barred from silent activation in production.
3. **Cron Secret Hardening**:
   - The reminder cron (`/api/cron/appointment-reminders`) strictly requires a production `CRON_SECRET` bearer token or header; development fallbacks are restricted to non-production environments.
4. **Data Minimization & PII Masking**:
   - Phone numbers are masked in server logs (`+1512****0188`). Sensitive message payloads and secrets are never committed to `communication_logs` or server stdout.
5. **Security Headers & CSP**:
   - Defensive headers applied globally via `next.config.ts`: `Content-Security-Policy` (strictly restricting script, style, font, image, and connect origins to verified domains while blocking external framing via `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `X-DNS-Prefetch-Control: off`.

---

## Architectural Decisions

| Topic | Decision | Rationale |
| --- | --- | --- |
| Brand | **Aether Estates** (*"Find a place that feels like home"*) | Fictional luxury portfolio brand establishing a credible real-estate agency presence. |
| Scoring Engine | Pure TypeScript function (`calculateQualificationScore`) | Guarantees 100% reproducibility, zero AI hallucinations, and sub-millisecond calculation time. |
| CRM Views | Kanban + Table with URL-backed state | Allows staff to organize prospects by workflow stage or inspect sortable tabular data seamlessly. |
| Score Immutability | Read-only in CRM | CRM displays scores calculated by the deterministic qualification engine; manual tampering is prevented. |
| Agent Scoping | Database RLS + Server-side query scoping | Enforces true data isolation; client parameter tampering is ignored and unauthorized lookups return 404. |
| Transcript Access | Follows parent lead ownership | Guarantees agents can only inspect AI chat dialogues for prospects they are actively managing. |
| AI Qualification | Input extraction only; Deterministic scoring authoritative | Prevents model hallucinations from altering scoring rules while enabling natural language understanding. |
| Conflict Precedence | Existing lead data > AI suggestions | Eliminates risk of automated AI hallucination overwriting verified customer information. |
| Appointment Double-Booking | PostgreSQL EXCLUDE constraint (`btree_gist`) | Guarantees zero double-booking at the database engine level, immune to web-tier concurrency races. |
| Timezone Strategy | Application Timezone (`America/Chicago`) + UTC DB storage | Provides consistent slot generation and human-readable times while maintaining canonical UTC persistence. |
| Calendar Operations | Unified Day/Week/List views powered by single query service | Avoids duplicating query or authorization logic across display modalities. |
| Reschedule Strategy | In-place atomic update (`id` preserved, self-excluded conflict check) | Maintains relational integrity and appointment history without destroying logical identity. |
| Cancellation Strategy | Soft status transition (`status = 'cancelled'`) | Preserves full historical records while releasing candidate slot for future bookings. |
| Email Architecture | Domain event-driven, provider-independent abstraction | Prevents vendor lock-in and guarantees email transport failure never rolls back business transactions. |
| Reminder Idempotency | Persistent PostgreSQL table `appointment_reminders` with atomic claiming | Eliminates duplicate reminder dispatches across distributed processes and restarts. |
| Reminder Offsets | Typed config: 24 hours (1440 min) and 1 hour (60 min) prior | Centralizes timing rules; prevents hardcoded arithmetic scattered across services. |
| WhatsApp Consent | Explicit server-verified database opt-in (`leads.whatsapp_opt_in`) | Prevents unsolicited messaging and strictly excludes AI from granting consent. |
| Channel Isolation | Independent parallel dispatch (Email != WhatsApp) | Guarantees transport issues in one channel never block notifications in other channels. |
| Communication Logs | Immutable audit records in `public.communication_logs` | Provides full traceability of message attempts without coupling business entities to provider SDKs. |
| Preferences vs Logs | Decoupled eligibility (Preferences) from delivery outcomes (Logs) | Changing preferences alters future deliveries without rewriting history. |
| Production Providers | Strict environment-guarded provider instantiation | Prevents silent mock provider activation in production deployments. |
| Content Security Policy | Enforced defense-in-depth CSP in `next.config.ts` | Prevents XSS, unauthorized data exfiltration, clickjacking, and rogue script injection. |
| HTTP Security Headers | Standard defensive HTTP headers configured in `next.config.ts` | Mitigates clickjacking, MIME sniffing, DNS privacy leaks, and cross-origin information leakage. |



