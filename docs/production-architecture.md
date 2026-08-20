# Aether Estates — Production Architecture & Deployment Topology

## 1. System Topology & Request Flow

```text
                                 Clients (Browser / Mobile)
                                             │
                                             ▼
                                Cloudflare / Vercel Edge CDN
                       (Global Anycast DNS, SSL Termination, DDoS Guard)
                                             │
                                             ▼
                                Next.js 16 (App Router + Turbopack)
                    ┌────────────────────────┴────────────────────────┐
                    ▼                                                 ▼
           Server Components & SSR                           API Route Handlers
        - Landing & Properties UI                        - `/api/chat` (AI Concierge)
        - Protected CRM Dashboard                         - `/api/appointments/*` (Booking Engine)
        - Staff Calendar & Kanban                         - `/api/leads/*` (Qualification & Assignment)
                    │                                     - `/api/cron/*` (Reminder Processor)
                    │                                     - `/api/health` (Lightweight Health Check)
                    └────────────────────────┬────────────────────────┘
                                             │
                                             ▼
                         Authoritative Server Services Layer
              (Deterministic Scoring, Availability Slot Engine, Notification Router)
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       ▼                     ▼                     ▼
             PostgreSQL (Supabase)       Google GenAI          Resend / Twilio
          - Core Business Tables      (Gemini 3.6 Flash)     - Transactional Email
          - Row Level Security (RLS)  - Property Search      - WhatsApp Messaging
          - EXCLUDE Constraints       - Signal Extraction    - Provider Retries
          - Communication Logs
```

---

## 2. Infrastructure & Hosting Components

| Layer | Technology | Hosting Provider | Deployment & Runtime Model |
|---|---|---|---|
| **Web & API Tier** | Next.js 16.3.1 (React 19) | Vercel / Node.js Serverless | Edge CDN + Serverless Node.js Functions with Turbopack |
| **Database & Auth** | PostgreSQL 15 + Supabase Auth | Supabase Cloud | Managed PostgreSQL with connection pooling (PgBouncer) & RLS |
| **AI Intelligence** | Gemini 3.6 Flash (`@google/genai`) | Google Cloud Vertex / AI Studio | Server-side REST API calls with structured tool schemas |
| **Email Delivery** | Resend REST API | Resend Infrastructure | High-deliverability transactional SMTP/REST transport |
| **WhatsApp Delivery**| Twilio WhatsApp REST API | Twilio Cloud | Global business messaging gateway |
| **Scheduled Tasks** | HTTP Cron Invocation | Vercel Cron / GitHub Actions | Authenticated POST `/api/cron/appointment-reminders` |
| **DNS & SSL** | Custom Domain HTTPS | Vercel Managed SSL / Cloudflare | Automated TLS 1.3 certificate provisioning & HTTPS redirection |

---

## 3. Environment Strategy & Segregation

```text
Local Development (.env.local)
  ├── Mock DevLogEmailProvider / DevLogWhatsAppProvider
  ├── Local Next.js dev server on http://localhost:3000
  └── Development CRON fallback secret enabled

Staging / Preview (Vercel Preview Deployments)
  ├── Ephemeral branch deployments
  ├── Isolated database branch or staging schema
  └── Read-only sandbox providers

Production (Vercel Production / Main Branch)
  ├── Canonical domain: https://aetherestates.com
  ├── Enforced Production Providers (Resend & Twilio)
  ├── Strict CRON_SECRET authentication
  └── Strict CSP and defensive headers enforced
```

---

## 4. Operational Observability & Error Normalization

- **Centralized Health Check**: `GET /api/health` validates database connectivity and provider configuration in < 50ms without exposing credentials.
- **Audit Traceability**: `public.communication_logs` records all notification attempts with normalized error codes (`NO_OPT_IN`, `MISSING_PHONE`, `PROVIDER_AUTH_ERROR`, `PROVIDER_TEMPORARY_ERROR`).
- **PII Protection**: Server logs mask phone numbers (`+1512****0188`) and exclude message bodies.
- **Concurrency Protection**: PostgreSQL `btree_gist` exclusion constraints guarantee zero double-booking at the database level.
