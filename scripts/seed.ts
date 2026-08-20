/**
 * Idempotent demo seed.
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   npm run seed
 *
 * Demo password for every seeded auth user: Phase1-Demo!2026
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEMO_PASSWORD = "Phase1-Demo!2026";

type Role = "admin" | "agent";

const users: Array<{
  email: string;
  full_name: string;
  role: Role;
  phone: string;
}> = [
  {
    email: "nina.admin@demo.aether.test",
    full_name: "Nina Alvarez",
    role: "admin",
    phone: "+1 415 555 0101",
  },
  {
    email: "ravi.admin@demo.aether.test",
    full_name: "Ravi Menon",
    role: "admin",
    phone: "+1 415 555 0102",
  },
  {
    email: "priya.agent@demo.aether.test",
    full_name: "Priya Shah",
    role: "agent",
    phone: "+1 628 555 0144",
  },
  {
    email: "james.agent@demo.aether.test",
    full_name: "James Okafor",
    role: "agent",
    phone: "+1 510 555 0177",
  },
];

const properties = [
  {
    title: "Modern Hillside Residence",
    description:
      "A serene architectural masterpiece tucked into the Austin foothills. Features soaring double-height ceilings, seamless indoor-outdoor living, floor-to-ceiling glass walls, and a private zero-edge pool overlooking lush greenbelts.",
    property_type: "house",
    status: "available",
    price: 1650000,
    city: "Austin",
    state: "TX",
    address: "2408 Barton Highlands Way",
    bedrooms: 4,
    bathrooms: 3.5,
    area_sqft: 3450,
    image_url:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80",
    ],
    features: [
      "Infinity Pool",
      "Smart Home Automation",
      "Chef's Kitchen",
      "Floor-to-Ceiling Windows",
      "Two-Car Garage",
      "Solar Panels",
      "Wine Cellar",
    ],
  },
  {
    title: "Biscayne Bay Penthouse",
    description:
      "Ultra-luxurious corner penthouse in downtown Miami with wrap-around glass terraces, unobstructed ocean and skyline vistas, private elevator foyer, Italian porcelain floors, and customized lighting.",
    property_type: "condo",
    status: "available",
    price: 2450000,
    city: "Miami",
    state: "FL",
    address: "888 Brickell Key Blvd #4201",
    bedrooms: 3,
    bathrooms: 3.5,
    area_sqft: 2820,
    image_url:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=80",
    ],
    features: [
      "Ocean Views",
      "Private Rooftop Deck",
      "Concierge Service",
      "Custom Walk-in Closet",
      "Spa Bath",
      "Sub-Zero Appliances",
    ],
  },
  {
    title: "Aspen Ridge Timber Chalet",
    description:
      "Exquisite modern mountain lodge featuring exposed cedar beams, radiant heated stone floors, majestic stone hearth, gourmet kitchen, and panoramic snow-capped mountain views.",
    property_type: "house",
    status: "available",
    price: 3100000,
    city: "Denver",
    state: "CO",
    address: "710 Evergreen Pine Trail",
    bedrooms: 5,
    bathrooms: 4.5,
    area_sqft: 4600,
    image_url:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600573472591-ee6c563aaec9?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1600&q=80",
    ],
    features: [
      "Designer Fireplace",
      "Heated Floors",
      "Ski-in / Ski-out Access",
      "Wine Cellar",
      "Hot Tub Deck",
      "Three-Car Garage",
    ],
  },
  {
    title: "Elliott Bay Glass Loft",
    description:
      "Dramatic architectural loft with soaring 18ft ceilings, polished concrete flooring, exposed brick accents, custom steel staircase, and direct Puget Sound water vistas.",
    property_type: "apartment",
    status: "available",
    price: 925000,
    city: "Seattle",
    state: "WA",
    address: "1420 Western Ave #504",
    bedrooms: 2,
    bathrooms: 2.0,
    area_sqft: 1420,
    image_url:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=80",
    ],
    features: [
      "Water Views",
      "High Ceilings",
      "EV Charging Station",
      "Hardwood Floors",
      "Smart Thermostat",
    ],
  },
  {
    title: "Highland Park Contemporary Villa",
    description:
      "Prestigious gated estate in Dallas offering timeless transitional architecture, custom marble waterfall island, primary wing with dual spa baths, heated swimming pool, and pristine manicured grounds.",
    property_type: "house",
    status: "available",
    price: 2850000,
    city: "Dallas",
    state: "TX",
    address: "3820 Beverly Dr",
    bedrooms: 5,
    bathrooms: 5.5,
    area_sqft: 5200,
    image_url:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
    ],
    features: [
      "Swimming Pool",
      "Outdoor Kitchen",
      "Home Theater",
      "Spa-Inspired Bath",
      "Gated Security",
      "Three-Car Garage",
    ],
  },
  {
    title: "Pacific Heights Grand Victorian",
    description:
      "Meticulously restored Victorian in prestigious Pacific Heights blending historic craftsmanship with modern Scandinavian interiors, custom millwork, bay view terrace, and private garden sanctuary.",
    property_type: "house",
    status: "available",
    price: 3450000,
    city: "San Francisco",
    state: "CA",
    address: "2150 Vallejo St",
    bedrooms: 4,
    bathrooms: 3.5,
    area_sqft: 3600,
    image_url:
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=80",
    ],
    features: [
      "Bay Views",
      "Private Garden",
      "Original Crown Molding",
      "Chef's Kitchen",
      "Wine Cellar",
      "Smart Security",
    ],
  },
  {
    title: "South Congress Designer Townhome",
    description:
      "Walkable urban townhome in South Austin steps from iconic restaurants and cafes. Boasts rooftop sunset deck, private plunge pool, minimalist finishes, and energy-efficient construction.",
    property_type: "townhouse",
    status: "available",
    price: 785000,
    city: "Austin",
    state: "TX",
    address: "1104 S Congress Ave #3",
    bedrooms: 3,
    bathrooms: 2.5,
    area_sqft: 1850,
    image_url:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600573472591-ee6c563aaec9?auto=format&fit=crop&w=1600&q=80",
    ],
    features: [
      "Private Rooftop Deck",
      "Plunge Pool",
      "Solar Panels",
      "Attached Garage",
      "Walk-in Closet",
    ],
  },
  {
    title: "Coral Gables Tropical Sanctuary",
    description:
      "Lush Mediterranean retreat framed by royal palms. Features private limestone loggia, resort-style heated pool, chef kitchen with custom cabinetry, and serene courtyard fountain.",
    property_type: "house",
    status: "pending",
    price: 2190000,
    city: "Miami",
    state: "FL",
    address: "412 Granada Blvd",
    bedrooms: 4,
    bathrooms: 4.0,
    area_sqft: 3750,
    image_url:
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1600&q=80",
    ],
    features: [
      "Resort Pool",
      "Courtyard Fountain",
      "Covered Loggia",
      "Impact Windows",
      "Two-Car Garage",
    ],
  },
  {
    title: "Cherry Creek Modern Flat",
    description:
      "Sun-drenched luxury corner condo in Denver's premier shopping and dining district. Custom European kitchen, quartz countertops, private covered terrace, and direct mountain outlooks.",
    property_type: "condo",
    status: "available",
    price: 640000,
    city: "Denver",
    state: "CO",
    address: "2850 E 2nd Ave #312",
    bedrooms: 2,
    bathrooms: 2.0,
    area_sqft: 1250,
    image_url:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=80",
    ],
    features: [
      "Mountain Views",
      "Covered Balcony",
      "Fitness Center",
      "Secure Underground Parking",
      "Hardwood Floors",
    ],
  },
  {
    title: "Queen Anne Skyline Residence",
    description:
      "Stunning contemporary home perched high on Queen Anne with unobstructed views of the Space Needle and Mount Rainier. Features multi-level decks, custom glass elevator, and smart lighting throughout.",
    property_type: "house",
    status: "sold",
    price: 2750000,
    city: "Seattle",
    state: "WA",
    address: "815 Highland Dr",
    bedrooms: 4,
    bathrooms: 4.5,
    area_sqft: 3900,
    image_url:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1600&q=80",
    ],
    features: [
      "Space Needle Views",
      "Multi-level Decks",
      "Glass Elevator",
      "Wine Room",
      "Two-Car Garage",
    ],
  },
  {
    title: "Uptown Dallas Penthouse Suite",
    description:
      "Sophisticated high-rise residence overlooking Klyde Warren Park. Hardwood herringbone floors, marble baths, private concierge, valet, and panoramic skyline exposure.",
    property_type: "apartment",
    status: "available",
    price: 1195000,
    city: "Dallas",
    state: "TX",
    address: "2018 Olive St #2904",
    bedrooms: 2,
    bathrooms: 2.5,
    area_sqft: 1720,
    image_url:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
    ],
    features: [
      "Skyline Views",
      "Valet Parking",
      "24/7 Concierge",
      "Rooftop Pool",
      "Herringbone Hardwood",
    ],
  },
  {
    title: "Lake Austin Waterfront Haven",
    description:
      "Exclusive private estate on the shores of Lake Austin with custom dual-slip boat dock, expansive limestone party pavilion, outdoor kitchen, and infinity pool flowing toward the water.",
    property_type: "house",
    status: "available",
    price: 4950000,
    city: "Austin",
    state: "TX",
    address: "4902 Waters Edge Pass",
    bedrooms: 6,
    bathrooms: 6.5,
    area_sqft: 6800,
    image_url:
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80",
    ],
    features: [
      "Direct Lake Access",
      "Private Boat Dock",
      "Infinity Pool",
      "Outdoor Pavilion",
      "Wine Cellar",
      "Four-Car Garage",
      "Smart Home Automation",
    ],
  },
  {
    title: "Marina District Designer Loft",
    description:
      "Chic sun-drenched condo situated two blocks from the Marina Green. High-end finishes, open kitchen with marble island, and private terrace ideal for morning espresso.",
    property_type: "condo",
    status: "available",
    price: 1350000,
    city: "San Francisco",
    state: "CA",
    address: "1850 Chestnut St #302",
    bedrooms: 2,
    bathrooms: 2.0,
    area_sqft: 1380,
    image_url:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80",
    ],
    features: [
      "Private Terrace",
      "Marble Kitchen Island",
      "Walk to Marina Green",
      "Deeded Parking",
      "Storage Unit",
    ],
  },
  {
    title: "Boulder Foothills Sanctuary",
    description:
      "Custom architect-designed home nestled in the pine foothills with striking Flatirons views, zero-carbon footprint design, triple-pane windows, and seamless connection to nature.",
    property_type: "house",
    status: "available",
    price: 1980000,
    city: "Denver",
    state: "CO",
    address: "1050 Sunshine Canyon Rd",
    bedrooms: 4,
    bathrooms: 3.5,
    area_sqft: 3200,
    image_url:
      "https://images.unsplash.com/photo-1600573472591-ee6c563aaec9?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1600573472591-ee6c563aaec9?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1600&q=80",
    ],
    features: [
      "Flatirons Views",
      "Net-Zero Solar System",
      "Radiant Heating",
      "Custom Woodwork",
      "Wraparound Deck",
    ],
  },
];

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in Supabase keys before seeding.`,
    );
  }
  return value;
}

async function upsertAuthUser(
  admin: SupabaseClient,
  email: string,
  full_name: string,
) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (!error && created.user) {
    return created.user;
  }

  const message = error?.message ?? "";
  if (!message.toLowerCase().includes("already")) {
    throw error ?? new Error(`Unable to create ${email}`);
  }

  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) {
    throw listError;
  }
  const existing = list.users.find((user) => user.email === email);
  if (!existing) {
    throw new Error(`User ${email} exists but could not be loaded.`);
  }
  return existing;
}

async function main() {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRole = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const profileIds: Record<string, string> = {};

  for (const user of users) {
    const authUser = await upsertAuthUser(admin, user.email, user.full_name);
    const { data: profile, error } = await admin
      .from("profiles")
      .update({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      })
      .eq("auth_user_id", authUser.id)
      .select("id")
      .single();

    if (error || !profile) {
      throw error ?? new Error(`Missing profile for ${user.email}`);
    }
    profileIds[user.email] = profile.id;
  }

  const priya = profileIds["priya.agent@demo.aether.test"];
  const james = profileIds["james.agent@demo.aether.test"];

  await admin.from("email_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await admin.from("lead_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await admin.from("lead_conversations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await admin.from("appointments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await admin.from("leads").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await admin.from("properties").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  let insertedProperties: Array<{ id: string; title: string }> | null = null;
  const { data: propData, error: propertyError } = await admin
    .from("properties")
    .insert(properties)
    .select("id, title");

  if (propertyError) {
    if (
      propertyError.message?.includes("features") ||
      propertyError.message?.includes("images")
    ) {
      console.warn(
        "\n[Phase 2 Notice] Supabase database has not run migration 0002 yet.",
      );
      console.warn(
        "Please run 'supabase/migrations/0002_phase2_public_properties_and_leads.sql' in your Supabase SQL Editor.",
      );
      console.warn("Falling back to inserting standard properties for now...\n");

      // Strip features and images for pre-migration schema
      const baseProps = properties.map((p) => {
        const { title, description, property_type, status, price, city, state, address, bedrooms, bathrooms, area_sqft, image_url } = p;
        return { title, description, property_type, status, price, city, state, address, bedrooms, bathrooms, area_sqft, image_url };
      });
      const { data: fallbackProps, error: fallbackError } = await admin
        .from("properties")
        .insert(baseProps)
        .select("id, title");

      if (fallbackError || !fallbackProps) {
        throw fallbackError ?? new Error("Property insert fallback failed");
      }
      insertedProperties = fallbackProps;
    } else {
      throw propertyError;
    }
  } else {
    insertedProperties = propData;
  }

  const sampleProperty = insertedProperties?.[0];

  const leads = [
    {
      full_name: "Amina Cole",
      email: "amina.cole@example.test",
      phone: "+1 555 0103",
      source: "website",
      status: "new",
      intent: "buy",
      city: "Austin",
      property_type: "house",
      budget_min: 1400000,
      budget_max: 1800000,
      bedrooms: 4,
      timeline: "0-3 months",
      lead_score: 42,
      assigned_agent_id: priya,
      property_id: sampleProperty?.id ?? null,
      message: "Interested in setting up a private walkthrough for Barton Highlands.",
    },
    {
      full_name: "Theo Grant",
      email: "theo.grant@example.test",
      phone: "+1 555 0104",
      source: "property_page",
      status: "qualifying",
      intent: "buy",
      city: "Seattle",
      property_type: "apartment",
      budget_min: 800000,
      budget_max: 1000000,
      bedrooms: 2,
      timeline: "3-6 months",
      lead_score: 61,
      assigned_agent_id: james,
      property_id: insertedProperties[3]?.id ?? null,
      message: "Can you send the HOA docs and monthly fee breakdown for the loft?",
    },
    {
      full_name: "Sofia Patel",
      email: "sofia.patel@example.test",
      phone: "+1 555 0105",
      source: "referral",
      status: "qualified",
      intent: "buy",
      city: "Miami",
      property_type: "condo",
      budget_min: 2200000,
      budget_max: 2600000,
      bedrooms: 3,
      timeline: "this quarter",
      lead_score: 78,
      assigned_agent_id: priya,
    },
    {
      full_name: "Elena Rossi",
      email: "elena.rossi@example.test",
      phone: "+1 555 0107",
      source: "property_page",
      status: "appointment_set",
      intent: "buy",
      city: "Denver",
      property_type: "house",
      budget_min: 2800000,
      budget_max: 3300000,
      bedrooms: 5,
      timeline: "30 days",
      lead_score: 88,
      assigned_agent_id: priya,
      property_id: insertedProperties[2]?.id ?? null,
      message: "Requesting a weekend tour of the Aspen Ridge chalet.",
    },
  ];

  let insertedLeads: Array<{ id: string; email: string }> | null = null;
  const { data: leadData, error: leadError } = await admin
    .from("leads")
    .insert(leads)
    .select("id, email");

  if (leadError) {
    if (
      leadError.message?.includes("property_id") ||
      leadError.message?.includes("message") ||
      leadError.message?.includes("property_page")
    ) {
      // Strip Phase 2 fields and map 'property_page' -> 'website'
      const baseLeads = leads.map((l) => ({
        full_name: l.full_name,
        email: l.email,
        phone: l.phone,
        source: l.source === "property_page" ? ("website" as const) : l.source,
        status: l.status,
        intent: l.intent,
        city: l.city,
        property_type: l.property_type,
        budget_min: l.budget_min,
        budget_max: l.budget_max,
        bedrooms: l.bedrooms,
        timeline: l.timeline,
        lead_score: l.lead_score,
        assigned_agent_id: l.assigned_agent_id,
      }));
      const { data: fallbackLeads, error: fallbackLeadError } = await admin
        .from("leads")
        .insert(baseLeads)
        .select("id, email");

      if (fallbackLeadError || !fallbackLeads) {
        throw fallbackLeadError ?? new Error("Lead insert fallback failed");
      }
      insertedLeads = fallbackLeads;
    } else {
      throw leadError;
    }
  } else {
    insertedLeads = leadData;
  }

  const elena = insertedLeads.find((lead) => lead.email === "elena.rossi@example.test");
  const theo = insertedLeads.find((lead) => lead.email === "theo.grant@example.test");
  if (!elena || !theo) {
    throw new Error("Expected seeded leads were missing after insert.");
  }

  const { data: conversation, error: conversationError } = await admin
    .from("lead_conversations")
    .insert({ lead_id: theo.id })
    .select("id")
    .single();
  if (conversationError || !conversation) {
    throw conversationError ?? new Error("Conversation insert failed");
  }

  const { error: messageError } = await admin.from("lead_messages").insert([
    {
      conversation_id: conversation.id,
      role: "user",
      content: "Hi — looking for a 2-bed in Seattle with sound views under 1M.",
    },
    {
      conversation_id: conversation.id,
      role: "assistant",
      content: "Thanks, Theo. I found the Elliott Bay Glass Loft which matches your criteria.",
    },
  ]);
  if (messageError) {
    throw messageError;
  }

  const { error: appointmentError } = await admin.from("appointments").insert([
    {
      lead_id: elena.id,
      agent_id: priya,
      scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: "scheduled",
      notes: "Private showing for Aspen Ridge Timber Chalet.",
    },
  ]);
  if (appointmentError) {
    throw appointmentError;
  }

  const { count: propertyCount } = await admin
    .from("properties")
    .select("*", { count: "exact", head: true });
  const { count: leadCount } = await admin
    .from("leads")
    .select("*", { count: "exact", head: true });

  console.log("Seed complete.");
  console.log(`Profiles: ${users.length} (2 admin, 2 agent)`);
  console.log(`Properties: ${propertyCount}`);
  console.log(`Leads: ${leadCount}`);
  console.log("Demo password for seeded users: Phase1-Demo!2026");
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
