# Aether Estates — Production Security Audit Report

## 1. Executive Summary

This document records the security review, authorization boundaries, data sanitization policies, and infrastructure hardening for **Aether Estates**.

- **Security Principle**:
  ```text
  Browser  →  Server  →  Authorization  →  Business Service  →  Database
  ```
  The browser and client are NEVER authoritative for identity, ownership, consent, scoring, or credentials.
- **Automated Security Test Suite**: `scripts/test-phase7a-security.ts` (19/19 passing tests).
- **Regression Suite**: 188/188 baseline platform tests passing across Phases 4A through 6D.

---

## 2. API Route Security Matrix

All endpoints under `/api/` are classified below:

| Route | HTTP Method | Access Classification | Authorization Guard | Description |
|---|---|---|---|---|
| `/api/health` | `GET` | **PUBLIC** | None | System uptime & environment check |
| `/api/chat` | `POST` | **PUBLIC** | Input Zod Validation & Rate Boundary | Public AI concierge dialogue & property exploration |
| `/api/chat/history` | `GET` | **PUBLIC / VERIFIED** | Conversation `accessToken` verification | Client-side conversation reload |
| `/api/me` | `GET` | **AUTHENTICATED** | `getCurrentProfile()` | Retrieves current user session & role |
| `/api/agents` | `GET` | **STAFF** | `requireApiStaff()` | Active licensed agent directory for scheduling |
| `/api/appointments` | `GET`, `POST` | **STAFF / AUTHORIZED** | `requireApiStaff()` + Agent Scoping | List calendar appointments / Book appointment |
| `/api/appointments/availability` | `GET` | **STAFF / PUBLIC** | Date range validation | Calculates available 30-min booking slots |
| `/api/appointments/[id]` | `GET` | **STAFF / AUTHORIZED** | `requireApiStaff()` + Owner check (404 on cross-agent) | Fetches appointment detail |
| `/api/appointments/[id]/reschedule` | `POST` | **STAFF / AUTHORIZED** | `requireApiStaff()` + Owner check + Conflict guard | Atomic in-place appointment reschedule |
| `/api/appointments/[id]/cancel` | `POST` | **STAFF / AUTHORIZED** | `requireApiStaff()` + Owner check | Soft-cancels appointment & releases slot |
| `/api/appointments/[id]/status` | `PATCH` | **STAFF / AUTHORIZED** | `requireApiStaff()` + Transition validation | Updates lifecycle status (`confirmed`, `no_show`, etc.) |
| `/api/leads/[id]/status` | `POST` | **STAFF / AUTHORIZED** | `requireApiStaff()` + Lead Agent check | Updates CRM stage (`new` → `qualifying` → `closed`) |
| `/api/leads/[id]/assign` | `POST` | **ADMIN ONLY** | `requireApiAdmin()` | Reassigns lead to licensed agent or unassigns |
| `/api/leads/[id]/transcript` | `GET` | **STAFF / AUTHORIZED** | `requireApiStaff()` + Lead Agent check | Reads visitor AI chat transcript |
| `/api/leads/[id]/ai-qualification` | `POST` | **STAFF / AUTHORIZED** | `requireApiStaff()` + Lead Agent check | AI signal extraction & deterministic scoring |
| `/api/leads/[id]/whatsapp-opt-in` | `POST` | **STAFF or VERIFIED SESSION** | Staff session or conversation `accessToken` | Updates WhatsApp opt-in consent |
| `/api/leads/[id]/preferences` | `GET`, `PATCH` | **STAFF / AUTHORIZED** | `requireApiStaff()` + Lead Agent check | Retrieves & updates communication preferences |
| `/api/leads/[id]/communication-logs`| `GET` | **STAFF / AUTHORIZED** | `requireApiStaff()` + Lead Agent check | Paginated communication audit history |
| `/api/cron/appointment-reminders` | `POST` | **CRON / SYSTEM** | `CRON_SECRET` Header / Bearer or Admin session | Processes due 24h & 1h appointment reminders |

---

## 3. Row Level Security (RLS) Policy Review

| Table | Public Access | Authenticated Agent | Authenticated Admin | Service Role |
|---|---|---|---|---|
| `public.profiles` | Denied | Read own profile | Read all, manage agents | Full access |
| `public.properties` | Read-only | Read-only | Manage listings | Full access |
| `public.leads` | Denied | Read/Update assigned leads (`assigned_agent_id = current_profile_id()`) | Read/Write all | Full access |
| `public.lead_conversations` | Denied | Read assigned lead conversations | Read all | Full access |
| `public.lead_messages` | Denied | Read assigned lead messages | Read all | Full access |
| `public.appointments` | Denied | Read/Update assigned appointments (`agent_id = current_profile_id()`) | Read/Write all | Full access |
| `public.appointment_reminders` | Denied | Denied direct access (handled via backend engine) | Read all | Full access |
| `public.communication_logs` | Denied | Read logs for assigned leads / appointments | Read all | Full access |

---

## 4. Service-Role Usage & Boundary Audit

The Supabase Service-Role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses Row Level Security. All instances in the codebase were audited:

1. **Isolation from Client Code**:
   - `createServiceRoleClient()` is located strictly in `src/lib/supabase/admin.ts`.
   - Grep search confirms **zero imports** in `src/components/`, client pages, or public JavaScript bundles.
2. **Pre-Authentication & Authorization**:
   - In API routes, user authorization (`requireApiStaff()` / `requireApiAdmin()`) is enforced before any service-role client calls execute.
   - Resource queries scope IDs explicitly (`.eq("id", id).eq("assigned_agent_id", profile.id)`).
3. **Background Tasks & Cron**:
   - The reminders cron (`/api/cron/appointment-reminders`) and notification router require service-role access to atomically claim due reminders and log delivery attempts across multiple agents without user-specific JWTs.

---

## 5. Secret & Environment Variable Audit

- **Client-Safe Variables (`NEXT_PUBLIC_*`)**:
  - `NEXT_PUBLIC_SUPABASE_URL`: Public Supabase API gateway.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key subject to RLS.
  - `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL`: Base application URL.
- **Server-Only Secrets (Never prefixed with `NEXT_PUBLIC_`)**:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`
  - `RESEND_API_KEY`
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `CRON_SECRET`
- **Git Ignore Verification**:
  - `.gitignore` explicitly ignores `.env`, `.env.*`, and `.env.local` while keeping `.env.example`.
  - No secret values or production keys are committed to repository files.

---

## 6. AI Tool Calling & Prompt Injection Protection

1. **Allowlisted Tool Dispatcher**:
   - Only `searchProperties` and `captureLeadInformation` are registered with Gemini.
   - Arbitrary function execution or SQL execution attempts throw `UNKNOWN_TOOL`.
2. **Independent Server-Side Consent**:
   - Gemini cannot grant contact consent. Lead capture requires `conversation.lead_capture_confirmed_at` stored in PostgreSQL.
3. **Deterministic Scoring Authority**:
   - AI extracts structured signals (budget, timeline, intent). Authoritative qualification scoring is computed deterministically via `calculateQualificationScore()`. AI hallucinations cannot inflate or alter lead scores.
4. **Data Isolation**:
   - AI tools do not accept agent IDs or CRM profile IDs from user prompts.

---

## 7. Appointment Concurrency & Double-Booking Protection

1. **Database-Level Constraint**:
   - PostgreSQL EXCLUDE constraint with `btree_gist` (`agent_id WITH =, tstzrange(scheduled_at, ...) WITH &&`) prevents concurrent double-booking of any agent at the database engine level.
2. **Application-Level Pre-checks**:
   - `checkAppointmentConflict()` excludes the current appointment ID during rescheduling, ensuring self-updates succeed while blocking collisions with adjacent bookings.
3. **Soft Cancellation**:
   - Cancelled appointments release the slot while retaining full audit records.

---

## 8. Web Security Headers & Content Security Policy (CSP)

### Content Security Policy (CSP) Status: **ENFORCED & CONFIGURED**
Aether Estates enforces a defense-in-depth Content Security Policy in `next.config.ts` designed to prevent Cross-Site Scripting (XSS), data exfiltration, clickjacking, and unauthorized resource injection:

| Directive | Configuration | Purpose & Rationale |
|---|---|---|
| `default-src` | `'self'` | Disallows loading resources from arbitrary third-party origins by default |
| `script-src` | `'self' 'unsafe-inline'` *(Prod)* / `+ 'unsafe-eval'` *(Dev only)* | Permits Next.js React hydration without enabling runtime string evaluation in production |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | Permits Tailwind/CSS transitions and Google Fonts stylesheets |
| `font-src` | `'self' https://fonts.gstatic.com data:` | Permits Google Fonts webfonts and embedded icons |
| `img-src` | `'self' data: blob: https://images.unsplash.com https://*.supabase.co` | Permits property portfolio photos and CDN assets |
| `connect-src` | `'self' https://*.supabase.co wss://*.supabase.co` | Restricts client API fetch and WebSocket real-time connections strictly to Supabase |
| `frame-ancestors` | `'none'` | Blocks framing by external sites (mitigates clickjacking, matching `X-Frame-Options: DENY`) |
| `object-src` | `'none'` | Disallows legacy plugins (Flash, Java applets) |
| `base-uri` | `'self'` | Prevents unauthorized `<base>` tag manipulation |
| `form-action` | `'self'` | Restricts form submission targets strictly to the application origin |

### Additional Defensive HTTP Headers:
- **`X-Frame-Options: DENY`**: Mitigates UI redress / clickjacking attacks across legacy browsers.
- **`X-Content-Type-Options: nosniff`**: Prevents MIME-type sniffing by browsers.
- **`Referrer-Policy: strict-origin-when-cross-origin`**: Protects path and query privacy on outbound links.
- **`Permissions-Policy: camera=(), microphone=(), geolocation=()`**: Disables unused browser device APIs.
- **`X-DNS-Prefetch-Control: off`**: Prevents speculative DNS prefetching from leaking user link privacy.

