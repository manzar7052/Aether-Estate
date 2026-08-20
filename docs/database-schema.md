# Database schema

Apply migrations in order:
1. `supabase/migrations/0001_init.sql` (Phase 1 foundation)
2. `supabase/migrations/0002_phase2_public_properties_and_leads.sql` (Phase 2 public properties and lead capture)

Authentication remains in `auth.users`. Application data is in `public`.

## Enums

- `user_role`: `admin`, `agent`
- `property_type`: `house`, `apartment`, `condo`, `townhouse`, `land`, `commercial`
- `property_status`: `draft`, `available`, `pending`, `sold`, `off_market`
- `lead_source`: `website`, `property_page`, `chatbot`, `referral`, `manual`, `other`
- `lead_status`: `new`, `qualifying`, `qualified`, `nurturing`, `appointment_set`, `closed`, `lost`
- `lead_intent`: `buy`, `rent`, `sell`, `unknown`
- `message_role`: `user`, `assistant`, `system`, `agent`
- `appointment_status`: `scheduled`, `confirmed`, `completed`, `cancelled`, `no_show`
- `email_event_type`: `welcome`, `follow_up`, `appointment_reminder`, `nurture`
- `email_event_status`: `queued`, `sent`, `failed`, `opened`, `clicked`

## Tables

### profiles

Application staff record.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary Key |
| `auth_user_id` | UUID | Unique FK → `auth.users(id)` ON DELETE CASCADE |
| `full_name`, `email`, `role`, `phone`, `avatar_url` | TEXT / ENUM | `role` defaults to `agent` |
| `created_at`, `updated_at` | TIMESTAMPTZ | Managed via trigger |

### properties

Listing catalog.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary Key |
| `title`, `description` | TEXT | Listing title & architectural description |
| `property_type` | ENUM | house, apartment, condo, townhouse, land, commercial |
| `status` | ENUM | draft, available, pending, sold, off_market |
| `price` | NUMERIC | Listing price in USD |
| `city`, `state`, `address` | TEXT | Location info |
| `bedrooms`, `bathrooms`, `area_sqft` | INT / NUMERIC | Key property specs |
| `image_url` | TEXT | Primary featured thumbnail |
| `images` | TEXT[] | Array of high-resolution gallery URLs (Phase 2) |
| `features` | TEXT[] | Array of database-stored amenities and highlights (Phase 2) |
| `created_at`, `updated_at` | TIMESTAMPTZ | Managed via trigger |

### leads

Inbound prospective clients and property inquiries.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary Key |
| `full_name`, `email`, `phone` | TEXT | Client contact information |
| `source` | ENUM | website, property_page, chatbot, referral, manual, other |
| `status` | ENUM | new, qualifying, qualified, nurturing, appointment_set, closed, lost |
| `intent` | ENUM | buy, rent, sell, unknown |
| `property_id` | UUID | FK → `properties(id)` ON DELETE SET NULL (Phase 2) |
| `message` | TEXT | Direct inquiry message note from visitor (Phase 2) |
| `city`, `property_type`, `budget_min`, `budget_max`, `bedrooms`, `timeline` | VARIOUS | Preferences captured from form / AI |
| `lead_score` | INT | Qualification score (0-100) |
| `assigned_agent_id` | UUID | FK → `profiles(id)` ON DELETE SET NULL |
| `created_at`, `updated_at` | TIMESTAMPTZ | Managed via trigger |

### lead_conversations / lead_messages

One lead has many conversations; each conversation has many messages. Chatbot messages land here in Phase 3.

### appointments

`lead_id` → leads, `agent_id` → profiles.

### email_events

Outbound email audit trail for Phase 6.

---

## Row Level Security (RLS)

- **properties**:
  - `properties_select_public`: `anon` and `authenticated` can read non-draft properties (`status <> 'draft'` or `public.is_admin()`).
  - `properties_admin_write`: `admin` only for insert, update, delete.
- **leads**:
  - `leads_insert_public`: `anon` and `authenticated` can insert new leads where `source in ('website', 'property_page', 'chatbot') and status = 'new'`.
  - `leads_select`: `admin` or assigned agent only. Public visitors cannot read any leads.
  - `leads_update`: `admin` or assigned agent only.
  - `leads_delete_admin`: `admin` only.
- **profiles**:
  - `profiles_select`: `authenticated` user reading own profile or `admin`.
- **appointments & email_events**:
  - Authenticated staff only according to assignment and role.

---

## Seed

`npm run seed` populates 14 realistic luxury and residential properties across Austin, Dallas, Miami, Denver, Seattle, and San Francisco with high-resolution photo arrays and amenity tags, along with sample leads and staff accounts.
