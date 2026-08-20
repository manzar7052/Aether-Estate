# Aether Estates — Demo Environment & Presentation Guide

## 1. Overview & Purpose
The Aether Estates Demo Environment provides a self-contained, realistic showcase of the AI-powered real estate lead automation platform. It is designed to demonstrate the complete visitor-to-appointment customer journey in **2 to 3 minutes** using strictly fictional personas, luxury Austin properties, and automated communication logs.

---

## 2. Demo Staff Accounts

| Persona | Role | Demo Email | Access Scope |
|---|---|---|---|
| **Demo Admin** | `admin` | `admin@demo.aether.test` | Global visibility across all leads, appointments, agent reassignment, and communication audit trails. |
| **Alex Morgan** | `agent` | `alex.agent@demo.aether.test` | Assigned leads, private appointment calendar, and transcripts for assigned leads only. |
| **Taylor Reed** | `agent` | `taylor.agent@demo.aether.test` | Assigned leads, private appointment calendar, and transcripts for assigned leads only. |

> [!NOTE]
> **Demo Password**: `Phase1-Demo!2026` (Standardized across all non-production demo staff accounts).

---

## 3. The 2–3 Minute Primary Client Demo Journey

```text
1. Public Discovery
   └─ Open Homepage (`/`) and Luxury Properties Directory (`/properties`).
   └─ Observe responsive design, property pricing, bedroom filters, and visual elegance.

2. AI Concierge Interaction
   └─ Launch the floating AI Chat widget on any property page or homepage.
   └─ Prompt: "I'm looking for a modern luxury home in Austin with a view and pool, budget around $3.5M."
   └─ AI executes `searchProperties` tool and recommends "The Glass Pavilion at Barton Creek".

3. Intent & Lead Capture
   └─ Customer provides contact details: "My name is Daniel Brooks, email daniel.brooks@demo.aether.estate, phone (512) 555-0201."
   └─ System captures lead, logs verified consent, and deterministically scores lead: 94/100 (HOT).

4. Agent CRM Management
   └─ Log in as Alex Morgan (`alex.agent@demo.aether.test`).
   └─ View Daniel Brooks at the top of the Kanban/List CRM with HOT badge.
   └─ Inspect AI qualification breakdown and full conversation transcript.

5. Appointment Booking & Omnichannel Dispatch
   └─ Book a private walkthrough appointment for Friday at 10:00 AM Central.
   └─ System checks availability slot engine, prevents double-booking, and stores UTC timestamp.
   └─ Transactional confirmation email and WhatsApp alert are dispatched.

6. Communication Audit Log Review
   └─ Open lead detail view in CRM and navigate to Communication History.
   └─ Verify recorded delivery status (`sent` for Email, `sent` for WhatsApp with masked PII).
```

---

## 4. Fictional Demo Dataset Structure

### A. Luxury Property Inventory (12+ Listings)
- **The Glass Pavilion at Barton Creek** ($3,450,000 | 5 Beds, 5.5 Baths | 5,200 sqft | Austin)
- **Lake Travis Waterfront Sanctuary** ($4,200,000 | 6 Beds, 6.5 Baths | 6,400 sqft | Austin)
- **Westlake Hills Modernist Villa** ($2,850,000 | 4 Beds, 4.5 Baths | 4,100 sqft | Westlake)
- **Downtown Austin Rainey Tower Penthouse** ($1,950,000 | 3 Beds, 3.5 Baths | 2,950 sqft | Austin)
- **Biscayne Bay Sky Residence** ($2,450,000 | 3 Beds, 3.5 Baths | 2,820 sqft | Miami)
- **Aspen Ridge Timber Chalet** ($4,950,000 | 5 Beds, 6.0 Baths | 5,800 sqft | Denver)
- **Seattle Waterfront Glass Townhome** ($1,850,000 | 3 Beds, 3.5 Baths | 2,650 sqft | Seattle)
- **Tarrytown Heritage Craftsman Revival** ($2,150,000 | 4 Beds, 3.5 Baths | 3,600 sqft | Austin)
- **Zilker Park Contemporary Loft** ($890,000 | 2 Beds, 2.0 Baths | 1,450 sqft | Austin)
- **Rollingwood Estate with Tennis Court** ($5,800,000 | 6 Beds, 7.5 Baths | 7,800 sqft | Westlake)
- **South Congress Designer Brownstone** ($1,450,000 | 3 Beds, 3.5 Baths | 2,400 sqft | Austin)
- **Hill Country Equestrian Ranch** ($3,900,000 | 4 Beds, 4.5 Baths | 4,600 sqft | Austin)

### B. Lead Qualification & Lifecycle Distribution (10 Leads)
| Lead Name | Category | Score | Status | Assigned Agent | Communication Prefs |
|---|---|---|---|---|---|
| **Daniel Brooks** | **HOT** | 94 | `qualified` | Alex Morgan | Email: Opted In, WhatsApp: Opted In |
| **Sophia Bennett** | **HOT** | 92 | `appointment_set` | Alex Morgan | Email: Opted In, WhatsApp: Opted In |
| **Liam Vance** | **HOT** | 88 | `closed` | Taylor Reed | Email: Opted In, WhatsApp: **Opted Out** |
| **Olivia Carter** | **WARM** | 68 | `qualifying` | Alex Morgan | Email: Opted In, WhatsApp: Opted In |
| **Ethan Mitchell** | **WARM** | 72 | `qualified` | Taylor Reed | Email: Opted In, WhatsApp: Opted In |
| **Marcus Hayes** | **WARM** | 62 | `new` | *Unassigned* | Email: Opted In, WhatsApp: Opted Out |
| **Chloe Davis** | **WARM** | 55 | `qualifying` | Alex Morgan | Email: Opted In, **No Phone Provided** |
| **Noah Parker** | **COLD** | 38 | `nurturing` | Taylor Reed | Email: Opted In, WhatsApp: Opted Out |
| **Maya Lin** | **COLD** | 32 | `nurturing` | *Unassigned* | Email: Opted Out, WhatsApp: Opted Out |
| **Lucas Scott** | **COLD** | 25 | `lost` | Alex Morgan | Email: Opted In, WhatsApp: Opted Out |

---

## 5. Seed & Reset Commands

### Seeding Demo Data (Idempotent & Safe)
```bash
npx tsx --env-file=.env.local scripts/seed-demo.ts
```

### Resetting Demo Data
```bash
npx tsx --env-file=.env.local scripts/reset-demo.ts
```

---

## 6. Safety & Privacy Controls
- **Zero Real Customer Data**: All records are generated using fictional names and `@demo.aether.estate` domains.
- **Suppressed Live Dispatches**: Seed scripts insert data directly via Supabase admin client, bypassing external email or SMS APIs to prevent accidental spam.
- **Strict Multi-Agent Scoping**: Demo agents cannot view or modify each other's leads, preserving security boundaries during live demonstrations.
