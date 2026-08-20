# Client Demo Presentation Script — Aether Estates

> **Target Duration**: 2–3 Minutes  
> **Audience**: Brokerage Executives, Real Estate Operators, Tech Leads, Foreign Clients  
> **Key Message**: *"Aether Estates is not just an AI chatbot—it is an end-to-end business system connecting lead capture, deterministic qualification, multi-agent CRM, calendar booking, and transactional communication."*

---

## Visual Demonstration Timeline

### 0:00 – 0:15 | Problem & Executive Overview
* **Action**: Display the Aether Estates luxury homepage (`/`).
* **Narration**:  
  *"In luxury real estate, inbound website visitors often inquire after hours. Traditional lead capture forms sit in inboxes for hours, leading to cold leads and lost commissions. Aether Estates solves this by combining 24/7 AI property discovery with automated qualification, agent assignment, and appointment booking in a single secure system."*

---

### 0:15 – 0:45 | AI Property Concierge & Natural Language Search
* **Action**: Click the floating AI Concierge button. Type: *"Looking for a 4-bedroom luxury estate in Westlake Hills with a pool."*
* **Narration**:  
  *"When a prospect visits the site, our AI Concierge engages in natural conversation. Powered by Google Gemini, the AI doesn't just chat—it calls backend search tools to query our actual property catalog in real time, presenting curated listings that match exact budget and location criteria."*

---

### 0:45 – 1:05 | In-Chat Lead Capture & Signal Extraction
* **Action**: Type: *"I'm looking to buy within 30 days around $5.5M. My name is Sophia Bennett, email sophia@demo.aether.estate, phone (512) 555-0144."*
* **Narration**:  
  *"As the prospect expresses intent, the AI captures their contact details directly in the chat session. It extracts structured signals—such as budget, timeline, and location—without breaking conversational flow."*

---

### 1:05 – 1:25 | Deterministic Lead Qualification & CRM Pipeline
* **Action**: Log into the CRM as Admin (`admin@demo.aether.test`), navigate to `/dashboard/leads`. Click on **Sophia Bennett**.
* **Narration**:  
  *"Behind the scenes, we don't trust an AI to guess lead scores. Our deterministic 100-point qualification engine evaluates their budget, timeline, and engagement depth, scoring Sophia at 85/100 and flagging her as a HOT lead in the CRM pipeline."*

---

### 1:25 – 1:45 | Agent Assignment & Multi-Agent Data Isolation
* **Action**: Click the Agent dropdown on Sophia's detail card, assign to **Alex Morgan**. Show the full AI conversation transcript tab.
* **Narration**:  
  *"Brokerage admins can assign leads to specific licensed agents. Thanks to PostgreSQL Row-Level Security, agents have strict data isolation—Alex only sees his assigned leads and calendar, while other agents cannot access his conversations or clients."*

---

### 1:45 – 2:05 | Real-Time Appointment Booking & Calendar
* **Action**: Click 'Book Appointment', select an available 30-minute slot on Wednesday at 10:00 AM CT, and submit. Navigate to `/dashboard/appointments`.
* **Narration**:  
  *"Scheduling a private walkthrough is instantaneous. The appointment engine generates live 30-minute business-hour slots, backed by database-level conflict locks that prevent double-booking."*

---

### 2:05 – 2:25 | Automated Transactional Notifications & Reminders
* **Action**: Show the appointment confirmation details modal.
* **Narration**:  
  *"The moment a showing is booked, rescheduled, or cancelled, our decoupled notification router dispatches branded confirmation emails via Resend and WhatsApp messages via Twilio. Furthermore, background cron workers automatically schedule 24-hour and 1-hour showing reminders."*

---

### 2:25 – 2:45 | Communication Preferences & Audit History
* **Action**: Navigate to the 'Communication History' timeline on Sophia's lead profile.
* **Narration**:  
  *"Every email, WhatsApp message, and reminder is logged in an immutable audit history with delivery status and timestamp. If a client opts out of WhatsApp, our preference guard immediately suppresses future messages while keeping email active."*

---

### 2:45 – 3:00 | Architecture & Engineering Summary
* **Action**: Show the production `/api/health` multi-service diagnostic check.
* **Narration**:  
  *"Aether Estates is built with Next.js 16, TypeScript, Supabase PostgreSQL, and Gemini AI. With 235 passing automated tests, hardened CSP security, and complete multi-agent isolation, it is a proven, production-grade system ready for brokerage deployment."*
