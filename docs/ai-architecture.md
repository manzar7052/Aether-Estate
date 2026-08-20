# AI Architecture & Qualification Strategy — Aether Estates

> **AI Real Estate Lead Automation Platform**
> Detailed technical breakdown of the AI Concierge, Tool Calling Engine, Signal Extraction, and Deterministic Lead Qualification pipeline.

---

## 1. AI Integration & Qualification Pipeline

```
CUSTOMER CONVERSATION (Natural Language Input)
                     │
                     ▼
             GOOGLE GEMINI API
           (gemini-3.6-flash)
                     │
                     ▼
          STRUCTURED SIGNAL EXTRACTION
   (budget, timeline, location, bedrooms, notes)
                     │
                     ▼
          SERVER-SIDE SCHEMA VALIDATION
                  (Zod Schemas)
                     │
                     ▼
         CONFLICT & PRECEDENCE HANDLING
  (Customer-stated form data overrides AI guesses)
                     │
                     ▼
     DETERMINISTIC QUALIFICATION ENGINE
 (100-Point Rule-Based Mathematical Scoring Model)
                     │
                     ▼
          AUTHORITATIVE QUALIFICATION
          (Score: 88/100, Tier: HOT)
```

> **Authoritative Qualification Guarantee**:
> *Gemini assists with interpretation, natural language understanding, and structured signal extraction. The deterministic Qualification Engine remains authoritative for the final score, category, and pipeline routing.*

---

## 2. Gemini Tool Calling Engine

The conversational concierge interacts with the platform via strict server-mediated **Function Calling (Tools)**. The AI model cannot execute code, SQL, or arbitrary API calls directly; it emits structured JSON function calls that are intercepted, validated, and executed by server-side services.

```
AI CONVERSATION
      │
      ▼
TOOL SELECTION (Gemini identifies intent)
      │
      ▼
TOOL ALLOWLIST CHECK (Server validates tool name)
      │
      ▼
ARGUMENT VALIDATION (Zod schema validates params)
      │
      ▼
SERVER-SIDE SERVICE EXECUTION (Supabase DB Query)
      │
      ▼
STRUCTURED RESULT RETURN (JSON payload to Gemini)
      │
      ▼
NATURAL LANGUAGE RESPONSE (Gemini generates friendly summary)
```

### Implemented Tool Inventory
| Tool Name | Parameters | Backing Service | Description |
|---|---|---|---|
| `searchProperties` | `location`, `min_price`, `max_price`, `property_type`, `bedrooms`, `bathrooms`, `status` | `searchProperties()` (`src/services/ai/tools/search-properties.ts`) | Queries PostgreSQL property catalog with exact & range filters, returning compact listing cards. |
| `captureLeadInformation` | `name`, `email`, `phone`, `budget_min`, `budget_max`, `timeline`, `preferred_city`, `notes` | `captureLeadFromChat()` (`src/services/leads/capture-lead.ts`) | Captures prospect contact details and signals directly into the CRM pipeline with explicit access token verification. |

---

## 3. AI Safety & Defensive Engineering

The application implements layered defenses against prompt injection and does not rely on the model for authorization or business truth.

### Defensive Layers
1. **Tool Allowlisting**: Any tool request outside the registered set (`searchProperties`, `captureLeadInformation`) is instantly rejected with `UNKNOWN_TOOL` before executing any logic.
2. **Schema & Type Enforcement**: All incoming tool arguments are coerced and validated against strict Zod schemas before reaching the database. Invalid formats (e.g. malformed phone numbers or invalid price ranges) return explicit validation errors to the model.
3. **No Direct Database Access**: The AI model never constructs or executes SQL queries. All data access occurs through parameterized Supabase queries with strict column select scoping.
4. **AI Score Stripping**: If an AI model or prompt injection attempt attempts to pass a custom `lead_score`, `qualification_category`, or `assigned_agent_id`, the server-side validator completely strips those fields before persistence.
5. **No AI-Generated Consent**: Lead communication preferences (Email & WhatsApp opt-ins) require explicit user consent and cannot be toggled on by model inference.
6. **No AI Ownership Assignment**: Agent assignments are strictly managed by administrative staff or configured deterministic routing rules, never by AI model decisions.
