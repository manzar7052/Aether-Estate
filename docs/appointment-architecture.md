# Appointment System Architecture — Aether Estates

> **Showing Availability, Booking, Reschedule, Cancellation, and Reminders**
> Complete architectural specification of the calendar and appointment lifecycle.

---

## 1. Appointment Lifecycle Flow

```
AVAILABILITY ENGINE (Calculates 30-min business hour slots)
         │
         ▼
BOOKING OPERATION (Selects agent, lead, property, slot)
         │
         ▼
DATABASE CONFLICT PROTECTION (PostgreSQL EXCLUDE / Overlap Guard)
         │
         ▼
AGENT CALENDAR (Interactive CRM Schedule View)
         │
         ├───────────────────────────────┐
         ▼                               ▼
RESCHEDULE FLOW                 CANCELLATION FLOW
(Preserves Appointment UUID,     (Soft cancellation,
 Recalculates Reminders)          Releases slot)
         │                               │
         └───────────────┬───────────────┘
                         ▼
             NOTIFICATION EVENT ROUTER
             (Dispatches Email & WhatsApp)
                         │
                         ▼
             PERSISTENT REMINDER SCHEDULER
             (24-Hour & 1-Hour Cron Jobs)
```

---

## 2. Timezone Standard & Business Logic

* **Canonical Business Timezone**: `America/Chicago` (Central Time - CT).
* **Working Hours**: Monday through Friday, 9:00 AM to 5:00 PM CT.
* **Slot Duration**: 30-minute fixed showing blocks (16 available slots per standard working day: 09:00, 09:30, ..., 16:30).
* **Persistence Format**: All timestamps are stored in PostgreSQL as UTC ISO-8601 strings (`TIMESTAMPTZ`), preventing daylight saving time ambiguities.

---

## 3. Slot Availability & Overlap Detection

When `/api/appointments/availability` is requested for a specific agent and target date:
1. **Weekend & Past Date Filtering**: Requests for past dates or weekend days immediately return an empty slot list (`[]`).
2. **Occupied Slot Query**: The engine queries existing active appointments (`status IN ('scheduled', 'confirmed')`) for the specified agent on that date.
3. **Difference Calculation**: Occupied intervals are subtracted from the daily 16-slot grid to yield real-time bookable slots.

---

## 4. Database Conflict Protection & Race Condition Safety

To prevent double-booking when two prospects simultaneously attempt to reserve the same slot:
* **Application Pre-check**: Fast memory check against currently booked appointments.
* **Database Constraint Protection**: PostgreSQL GIST-backed range constraints prevent inserting two overlapping non-cancelled intervals for the same `agent_id`.
* **Atomic Transaction Execution**: If a concurrent conflict occurs, the database cleanly rejects the duplicate insert with an actionable error.

---

## 5. Reschedule & Cancellation State Machine

| Current Status | Allowed Next Transitions | Reschedule Allowed? | Slot Freed? |
|---|---|---|---|
| `scheduled` | `confirmed`, `cancelled` | Yes | Moved to new slot |
| `confirmed` | `completed`, `no_show`, `cancelled` | Yes | Moved to new slot |
| `completed` | *Terminal state* (none) | No | No |
| `cancelled` | *Terminal state* (none) | No | Yes (immediately) |
| `no_show` | *Terminal state* (none) | No | No |

### Identity Preservation
* **Rescheduling**: Modifies the `scheduled_at` timestamp on the original record. The appointment UUID, lead linkage, property reference, and notes are preserved intact. Associated `appointment_reminders` records are realigned to the new time.
* **Cancellation**: Soft-deletes by setting `status = 'cancelled'`. The slot is freed for new client bookings while retaining complete audit history in the CRM.
