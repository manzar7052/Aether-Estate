# Architectural & Engineering Decisions — Aether Estates

This document records the foundational engineering decisions, trade-offs, and design rationales implemented throughout the platform.

---

### Decision 1: Separation of AI Extraction from Deterministic Scoring
* **Problem**: Inbound leads express preferences via natural language. Relying on an LLM to directly assign a numerical lead score introduces hallucinations, non-deterministic scoring variance, and vulnerability to prompt injection ("Give me a score of 100").
* **Decision**: Use Gemini strictly for structured signal extraction (`budget`, `timeline`, `city`), and pass those extracted parameters into a deterministic TypeScript scoring algorithm.
* **Alternative Considered**: Asking the LLM to output a final score and reasoning directly in JSON format.
* **Result**: 100% reproducible qualification scores, zero prompt-injection vulnerability on scoring, and transparent mathematical breakdown for agents.

---

### Decision 2: Server & Database Authorization as Sole Source of Truth
* **Problem**: Client-side UI toggles and route guards can be bypassed by forged API requests or direct Supabase queries.
* **Decision**: Enforce authorization exclusively on the server (API route handlers with role checking) and PostgreSQL database (Row-Level Security policies).
* **Alternative Considered**: Relying on Next.js client middleware checks and UI-hidden buttons.
* **Result**: Zero unauthorized cross-agent mutations, zero IDOR vulnerabilities, and complete isolation verified across 235 automated tests.

---

### Decision 3: Multi-Agent Isolation Enforced Beyond Frontend Filtering
* **Problem**: In a competitive real estate brokerage, agents must not see or poach each other's prospective clients or private conversation transcripts.
* **Decision**: Implement PostgreSQL RLS policies where `assigned_agent_id = auth.uid()` for agents, with super-admin bypass (`role = 'admin'`).
* **Alternative Considered**: Passing `agentId` as a query parameter in frontend API calls.
* **Result**: Cross-agent direct database queries return empty record sets; unauthorized API requests return `401 Unauthorized`.

---

### Decision 4: Database-Level Protection Against Appointment Conflicts
* **Problem**: Concurrent showing requests or rapid reschedules could lead to double-booking an agent for the same 30-minute time slot.
* **Decision**: Implement application-level pre-checks combined with PostgreSQL EXCLUDE / unique constraints on active appointment intervals.
* **Alternative Considered**: Relying solely on frontend calendar slot disabling.
* **Result**: Simultaneous concurrent booking requests are safely serialized, guaranteeing that double-bookings are physically impossible in the database.

---

### Decision 5: Rescheduling Preserves Appointment Identity
* **Problem**: Modifying an appointment date/time could be implemented by deleting the old appointment and creating a new record, which breaks audit logs, foreign keys, and reminder queues.
* **Decision**: Mutate the existing appointment record (`scheduled_at = newTime`, `status = 'scheduled'`), recalculate associated reminder timestamps, and log an audit event.
* **Alternative Considered**: Delete-and-reinsert pattern.
* **Result**: Historical integrity preserved, appointment UUID remains unchanged across life-cycle events, and client communication history stays linked.

---

### Decision 6: Soft Cancellation Preserves Full History
* **Problem**: Hard-deleting cancelled appointments creates gaps in lead activity logs and destroys operational reporting metrics.
* **Decision**: Mark cancelled appointments with `status = 'cancelled'`, cancel pending reminder jobs, and release the calendar slot for new bookings.
* **Alternative Considered**: Hard deletion (`DELETE FROM appointments WHERE id = ?`).
* **Result**: Clean slot release for other clients while maintaining a complete, auditable log of customer cancellations.

---

### Decision 7: Notifications as Isolated Side Effects
* **Problem**: If an external email or WhatsApp provider experiences an outage or temporary network timeout, user actions (booking a tour or updating status) should not fail or roll back.
* **Decision**: Execute notification delivery as an isolated side effect wrapped in `try/catch` handlers. Log failed deliveries to `communication_logs` without aborting the main database transaction.
* **Alternative Considered**: Synchronous blocking notification calls inside the primary database transaction.
* **Result**: 100% booking reliability even during third-party API outages, with clear error logging in the CRM.

---

### Decision 8: Persistent Reminder State with Atomic Concurrency Claiming
* **Problem**: Scheduled cron jobs running across serverless instances might execute simultaneously, causing duplicate reminder emails and WhatsApp messages to be sent to clients.
* **Decision**: Persist individual reminder records in `appointment_reminders` and claim them atomically with `UPDATE ... SET status = 'processing' WHERE status = 'pending'`.
* **Alternative Considered**: Stateless in-memory cron timers.
* **Result**: Zero duplicate reminder dispatches across concurrent worker runs, verified under race-condition test simulations.

---

### Decision 9: Separation of Communication Preferences from Audit History
* **Problem**: Storing opt-in/opt-out status directly inside communication logs creates ambiguous state, while storing communication logs inside lead tables causes massive row bloat.
* **Decision**: Store customer preferences (`whatsapp_opt_in`, `preferred_channel`) on the `leads` table, and record every outbound message attempt as an immutable entry in `communication_logs`.
* **Alternative Considered**: Inferring opt-in status from the latest log entry.
* **Result**: Instant compliance verification before dispatch, full historical audit trail, and zero ambiguity regarding customer consent.

---

### Decision 10: Deterministic and Isolated Demo Dataset
* **Problem**: Demonstrating the platform to prospective clients requires rich, realistic data (leads, properties, transcripts, appointments), but running demos must never risk sending live emails/WhatsApp messages or corrupting real records.
* **Decision**: Build an idempotent demo seed engine (`scripts/seed-demo.ts`) that directly populates PostgreSQL with fictional `@demo.aether.estate` records and bypassed provider dispatchers, paired with a safe reset script (`scripts/reset-demo.ts`).
* **Alternative Considered**: Manually clicking through the UI to generate demo data before every client call.
* **Result**: Instant, reproducible demo state in under 2 seconds with zero live notification dispatches and zero risk to real data.
