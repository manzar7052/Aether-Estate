# Communication Architecture & Notification Router — Aether Estates

> **Multi-Channel Transactional Messaging, Failure Isolation, and Audit Trails**
> Complete architectural specification of the email and WhatsApp notification systems.

---

## 1. Notification Router Topology

```
                  BUSINESS EVENT
     (appointment.created, appointment.rescheduled,
      appointment.cancelled, reminder.due)
                        │
                        ▼
               NOTIFICATION ROUTER
             (Event Handler & Dispatcher)
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
    EMAIL ROUTE                  WHATSAPP ROUTE
   (Zod Validation,              (Opt-in Verification,
    HTML Template Compile)        Phone Format Validation)
         │                             │
         ▼                             ▼
   EMAIL PROVIDER              WHATSAPP PROVIDER
 (Resend Transactional API)   (Twilio WhatsApp API)
         │                             │
         └──────────────┬──────────────┘
                        ▼
            COMMUNICATION AUDIT LOGS
           (Immutable PostgreSQL Log)
```

---

## 2. Channel Independence & Failure Isolation

The platform treats email and WhatsApp as **decoupled, independent delivery pipelines**:
1. **Isolated Provider Failures**: If Twilio WhatsApp encounters a transient gateway error or rate limit, transactional confirmation emails via Resend still send cleanly.
2. **Non-Blocking Execution**: Outbound dispatches are executed as non-blocking side effects. A failure in external notification providers never rolls back primary database transactions (such as booking, rescheduling, or lead creation).
3. **Graceful Degradation**: If a customer has no phone number or has not opted in to WhatsApp, the WhatsApp pipeline records `status: skipped` while the email pipeline proceeds without interruption.

---

## 3. Communication Preferences & Opt-In Policy

* **Lead Preferences (`leads` table)**:
  * `whatsapp_opt_in`: Boolean consent indicator.
  * `whatsapp_opt_in_at`: Timestamp of explicit consent grant.
  * `whatsapp_opt_out_at`: Timestamp of unsubscribe event.
  * `preferred_channel`: Preferred contact channel (`email` or `whatsapp`).
* **Instant Suppression**: When `whatsapp_opt_in = false`, any attempted WhatsApp notification is intercepted before provider dispatch and logged as `skipped` with error code `NO_OPT_IN`.

---

## 4. Persistent Reminder Processor & Cron Engine

Showing reminders (24h and 1h before appointment start) are managed via a persistent state machine:

```
APPOINTMENT BOOKED
       │
       ▼
PERSIST REMINDER RECORDS (`status: pending`)
       │
       ▼
CRON TRIGGER (`POST /api/cron/appointment-reminders`)
       │
       ▼
ATOMIC RECORD CLAIM (`status: processing`)
       │
       ▼
DISPATCH NOTIFICATIONS (Email + WhatsApp)
       │
       ▼
RECORD STATUS UPDATE (`status: sent` or `status: failed`)
```

* **Atomic Claiming**: Uses `UPDATE appointment_reminders SET status = 'processing' WHERE status = 'pending' AND scheduled_for <= NOW()` to prevent race conditions across parallel cron instances.
* **Bounded Retries**: On transient provider failure, reminders are retried up to 3 times before transitioning to `status: failed`.
* **Timing Drift Protection**: If an appointment is rescheduled after a reminder is queued, the processor realigns the `scheduled_for` timestamp automatically.

---

## 5. Communication Audit Logging (`communication_logs`)

Every outbound messaging attempt (successful, skipped, or failed) is recorded in PostgreSQL:

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Unique primary key. |
| `lead_id` | `UUID` | Foreign key referencing `leads.id`. |
| `appointment_id` | `UUID?` | Optional reference to `appointments.id`. |
| `channel` | `TEXT` | `email` or `whatsapp`. |
| `event_type` | `TEXT` | Event trigger (e.g. `appointment.created`, `reminder.24h`). |
| `recipient_type` | `TEXT` | `customer` or `agent`. |
| `recipient` | `TEXT` | Sanitized destination email or masked phone number. |
| `status` | `TEXT` | `pending`, `sent`, `skipped`, or `failed`. |
| `template` | `TEXT` | Identifier of template used. |
| `provider_message_id` | `TEXT?` | Provider tracking ID (e.g. Resend ID or Twilio SID). |
| `error_code` | `TEXT?` | Reason code for skipped or failed dispatches (e.g. `NO_OPT_IN`). |
| `created_at` | `TIMESTAMPTZ` | Timestamp of logging. |
