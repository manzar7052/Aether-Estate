# Architecture Overview — Aether Estates

> **AI-Powered Real Estate Lead-to-Appointment Automation Platform**
> An end-to-end platform that converts property inquiries into qualified leads, routes them through a secure CRM, assigns agents, manages appointments, and automates transactional communication through email and WhatsApp.

---

## 1. System Topology & Component Diagram

```
                        CLIENT (Browser)
                               │
                               ▼
                      NEXT.JS APPLICATION
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
  PUBLIC WEBSITE           AI CONCIERGE         CRM & CALENDAR
 (/ & /properties)        (/api/chat)         (/dashboard/*)
        │                      │                      │
        │                      ▼                      ▼
        │                 AI SERVICES            LEAD & CRM
        │             (Gemini Tool Calling)       SERVICES
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                               ▼
                       SUPABASE / POSTGRES
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ROW-LEVEL         DETERMINISTIC     APPOINTMENT
        SECURITY (RLS)    QUALIFICATION     SLOT ENGINE
                               │
                               ▼
                      NOTIFICATION ROUTER
                     (Events & Dispatch)
                         ┌─────┴─────┐
                         ▼           ▼
                   EMAIL ROUTE    WHATSAPP ROUTE
                     (Resend)       (Twilio)
                         │           │
                         └─────┬─────┘
                               ▼
                     COMMUNICATION AUDIT
                            LOGS
```

---

## 2. Architecture Layers

### Presentation Layer
* **Public Website (`/`, `/properties`, `/properties/[id]`)**: Fast, accessible luxury property catalog featuring dynamic search, price/bedroom filters, and rich media galleries.
* **AI Concierge Interface**: Interactive modal dialogue providing natural language property discovery, contextual recommendations, and conversational lead capture.
* **CRM Dashboard (`/dashboard`, `/dashboard/leads`, `/dashboard/appointments`)**: Multi-agent lead management system with status pipeline stages, real-time qualification badge indicators, full AI conversation transcripts, and agent calendar scheduling.
* **Communication Audit History (`/dashboard/leads/[id]`)**: Chronological message timeline with channel filters (Email vs WhatsApp), delivery status badges (`sent`, `skipped`, `failed`), template metadata, and customer contact preferences.

### Application Layer
* **AI Services (`src/services/ai/`)**: Google Gemini tool calling integration (`gemini-3.6-flash`), tool dispatch allowlist, strict JSON argument validation, and signal extraction pipeline.
* **Lead Services (`src/services/leads/`)**: Secure session creation (`createConversation`), verified conversation lookup, lead capture, and agent assignment workflows.
* **Qualification Engine (`src/services/leads/qualification.ts`)**: Authoritative, deterministic 100-point scoring algorithm with weighted category evaluation (Budget: 30pts, Timeline: 30pts, Engagement: 20pts, Property Fit: 20pts) and automatic classification (`HOT` >= 70, `WARM` 40–69, `COLD` <= 39).
* **Appointment Engine (`src/services/appointments/`)**: Business-hour slot generator (America/Chicago), PostgreSQL conflict-protected booking, status transition state machine, and appointment identity-preserving reschedule/cancellation flows.
* **Notification & Communication Engine (`src/services/notifications/`)**: Multi-channel router, transactional email dispatcher (Resend), WhatsApp business messaging (Twilio), persistent reminder processor (24h and 1h cron triggers), and immutable communication audit logging.

### Data Layer
* **Supabase / PostgreSQL 15+**: Relational database schema with strong typing, foreign keys, cascade safety, and check constraints.
* **Row-Level Security (RLS)**: Fine-grained database authorization policies ensuring agent data isolation (agents can only query and mutate their assigned leads and calendar appointments, while admins have global visibility).
* **PostgreSQL EXCLUDE Constraints**: GIST-backed range constraints preventing overlapping double-bookings for the same agent at the database level.

### External Providers
* **AI Provider**: Google GenAI API (Gemini).
* **Email Provider**: Resend transactional API with development console fallback.
* **WhatsApp Provider**: Twilio WhatsApp Business API with development console fallback.
* **Hosting / CDN**: Cloudflare Pages & OpenNext Serverless Functions.

---

## 3. Trust Boundaries & Security Architecture

```
BROWSER (Untrusted Client)
    │  [Client-side validation only for UX]
    ▼
NEXT.JS SERVER / API (Validation & Authentication Boundary)
    │  [Zod schema validation, Supabase Auth session extraction]
    ▼
SERVER-SIDE AUTHORIZATION (Role & Ownership Guard)
    │  [Verifies user role (Admin vs Agent) and lead/appointment ownership]
    ▼
BUSINESS SERVICE LAYER (Deterministic Logic)
    │  [Deterministic qualification, conflict detection, preference checks]
    ▼
DATABASE / PERSISTENCE LAYER (Authoritative State)
    │  [PostgreSQL constraints, RLS policies, immutable audit logs]
    ▼
EXTERNAL DISPATCH CHANNELS (Side Effects)
       [Failure-isolated, non-blocking email and WhatsApp dispatches]
```

### Core Trust Principles
1. **The Browser is Never Trusted**: All inputs undergo server-side validation via Zod schemas. No client-supplied role or agent assignment is accepted without server validation.
2. **The AI Model is Not Trusted for Business Truth or Authorization**: Gemini is used exclusively for conversational natural language processing and structured signal extraction. The server-side deterministic qualification engine remains the sole authority on lead scores and tiers.
3. **Database is the Authoritative Record**: State transitions, appointment schedules, and communication preferences are enforced at the database level using PostgreSQL constraints and RLS policies.
4. **Isolated Notification Side Effects**: Delivery failures in external notification providers (Resend or Twilio) never abort or roll back primary database transactions (such as appointment bookings or status updates).
