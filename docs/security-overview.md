# Security Architecture & Controls Overview — Aether Estates

> **Security Posture & Controls Matrix**
> *Security controls were implemented and verified through targeted automated and runtime testing across all system layers.*

---

## 1. Authentication & Session Management
* **Provider**: Supabase Auth (JWT & HttpOnly Session Cookies).
* **Session Validation**: Next.js Server Components and API Route Handlers validate the Supabase Auth context on every request.
* **Role Hierarchy**: Strictly split between `admin` (global brokerage access, reassignment, reporting) and `agent` (scoped access to assigned leads and appointments).

---

## 2. Server-Side Authorization & Row-Level Security (RLS)
* **Defense in Depth**: Authorization is enforced both at the Next.js API layer and PostgreSQL database level via Row-Level Security.
* **Agent Data Isolation**: Agents querying `leads` or `appointments` receive only rows where `assigned_agent_id = auth.uid()`.
* **Super-Admin Bypass**: Authenticated users with `role = 'admin'` are granted global visibility across all agents, leads, and audit histories.
* **Anonymous Access Block**: Unauthenticated requests to `/dashboard/*`, `/api/appointments/*`, `/api/leads/*`, or `/api/agents` return `HTTP 401 Unauthorized`.

---

## 3. IDOR & Parameter Tampering Defense
* **Insecure Direct Object References (IDOR)**: Attempting to fetch or mutate a lead, transcript, or appointment using a foreign UUID without proper role or ownership authorization is denied server-side with `401 Unauthorized` or `404 Not Found`.
* **Mass Assignment & Field Injection Guard**: Zod validation schemas strictly whitelist allowed mutation fields. Privileged fields such as `role`, `lead_score`, `qualification_category`, and `created_at` are stripped before database persistence.

---

## 4. Service-Role Secret Isolation
* **Zero Client Exposure**: The Supabase `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to server-side Node.js runtimes.
* **Client-Safe Environment Variables**: Only public configuration (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`) is exposed to the browser bundle.

---

## 5. AI Security & Prompt Injection Mitigation
* **Tool Allowlisting**: The AI dispatcher explicitly validates requested tool names against a rigid allowlist (`searchProperties`, `captureLeadInformation`). Any attempt by the model to call unregistered tools is rejected immediately.
* **No Direct SQL Execution**: Gemini generates structured JSON parameters, never SQL queries.
* **Separation of Concerns**: Qualification scores and agent assignments are calculated by deterministic TypeScript code, preventing prompt injection attacks from manipulating lead tiers.

---

## 6. Notification & Consent Compliance
* **Explicit Opt-In Enforcement**: Outbound WhatsApp notifications require positive consent (`whatsapp_opt_in: true`).
* **Instant Opt-Out**: When a lead opts out of WhatsApp, future dispatches are skipped with `NO_OPT_IN` logs.
* **Cron Endpoint Protection**: Scheduled cron endpoints (`/api/cron/appointment-reminders`) require an authorized `CRON_SECRET` bearer token header; unauthenticated requests return `401 Unauthorized`.

---

## 7. Production HTTP Security Headers & Content Security Policy (CSP)

| Header | Production Directive / Value | Purpose |
|---|---|---|
| **Content-Security-Policy** | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'` | Mitigates XSS and unauthorized script execution. Eliminates `'unsafe-eval'` in production builds. |
| **X-Frame-Options** | `DENY` | Prevents Clickjacking attacks by forbidding iframe embedding. |
| **X-Content-Type-Options** | `nosniff` | Blocks MIME-type sniffing. |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Protects URL parameters and referrer data during cross-origin navigation. |
| **Permissions-Policy** | `camera=(), microphone=(), geolocation=()` | Disables unused browser hardware capabilities. |
| **X-DNS-Prefetch-Control** | `off` | Prevents prefetching of external DNS records. |

> **Environment-Aware CSP Policy**:
> * In **Production (`NODE_ENV === "production"`)**, `script-src` is strictly hardened to `'self' 'unsafe-inline'` without `'unsafe-eval'`.
> * In **Development (`NODE_ENV !== "production"`)**, `'unsafe-eval'` is permitted exclusively to enable Next.js Turbopack Hot Module Replacement (HMR) and Fast Refresh.

---

## 8. Verification & Audit Results
* **Security & Hardening Test Suite (`scripts/test-phase7a-security.ts`)**: **19 / 19 passed (100%)**.
* **Zero Secret Leaks**: Automated privacy audit scanned all communication log tables, verifying that API tokens, passwords, and sensitive keys are never persisted to client-visible tables.
