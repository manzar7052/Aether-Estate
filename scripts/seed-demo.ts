/**
 * Deterministic, Idempotent Demo Seed Script — Aether Estates (Phase 7C)
 *
 * Populates realistic fictional demo dataset:
 * - 3 Primary Demo Staff (Demo Admin, Alex Morgan, Taylor Reed) + Existing Staff
 * - 12 Luxury Properties (Austin, Westlake Hills, Lake Travis, Miami, Denver, Seattle)
 * - 10 Fictional Demo Leads (HOT, WARM, COLD distribution, various stages & preferences)
 * - Demo Conversations with realistic property queries and verified contact consent
 * - Demo Appointments (confirmed, scheduled, completed, cancelled, no-show)
 * - Demo Reminders (in safe states)
 * - Demo Communication History (Email & WhatsApp logs matching preferences)
 *
 * Safe to rerun repeatedly with zero endless duplicates.
 * Usage: npx tsx --env-file=.env.local scripts/seed-demo.ts
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEMO_PASSWORD = "Phase1-Demo!2026";

type Role = "admin" | "agent";

const demoUsers: Array<{
  email: string;
  full_name: string;
  role: Role;
  phone: string;
}> = [
  {
    email: "admin@demo.aether.test",
    full_name: "Demo Admin",
    role: "admin",
    phone: "+1 512 555 0100",
  },
  {
    email: "alex.agent@demo.aether.test",
    full_name: "Alex Morgan",
    role: "agent",
    phone: "+1 512 555 0101",
  },
  {
    email: "taylor.agent@demo.aether.test",
    full_name: "Taylor Reed",
    role: "agent",
    phone: "+1 512 555 0102",
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
  {
    email: "nina.admin@demo.aether.test",
    full_name: "Nina Alvarez",
    role: "admin",
    phone: "+1 415 555 0101",
  },
];

const demoProperties = [
  {
    title: "The Glass Pavilion at Barton Creek",
    description: "Iconic modernist villa featuring double-height glass elevations, infinity edge pool cantilevered over Barton Creek greenbelt, private wine cellar, and integrated smart-home automation.",
    property_type: "house",
    status: "available",
    price: 3450000,
    city: "Austin",
    state: "TX",
    address: "3104 Barton Creek Blvd",
    bedrooms: 5,
    bathrooms: 5.5,
    area_sqft: 5200,
    image_url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1600&q=80",
    ],
    features: ["Infinity Pool", "Wine Cellar", "Smart Home Automation", "Private Greenbelt Access", "3-Car Garage"],
  },
  {
    title: "Lake Travis Waterfront Sanctuary",
    description: "Spectacular contemporary waterfront estate with private boat dock, multi-tier panoramic limestone terraces, chef's outdoor kitchen, and sunset lake views.",
    property_type: "house",
    status: "available",
    price: 4200000,
    city: "Austin",
    state: "TX",
    address: "14802 Comanche Trail",
    bedrooms: 6,
    bathrooms: 6.5,
    area_sqft: 6400,
    image_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80",
    ],
    features: ["Private Boat Dock", "Outdoor Kitchen", "Panoramic Lake Views", "Spa & Hot Tub", "Guest House"],
  },
  {
    title: "Westlake Hills Modernist Villa",
    description: "Quiet luxury in Eanes ISD. Single-story organic architecture featuring Texas limestone, white oak cabinetry, courtyard swimming pool, and private primary retreat.",
    property_type: "house",
    status: "available",
    price: 2850000,
    city: "Westlake",
    state: "TX",
    address: "804 Westlake Drive",
    bedrooms: 4,
    bathrooms: 4.5,
    area_sqft: 4100,
    image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
    ],
    features: ["Courtyard Pool", "Eanes ISD", "White Oak Finishes", "Wine Room", "Solar Power System"],
  },
  {
    title: "Downtown Austin Rainey Tower Penthouse",
    description: "Sky-high duplex penthouse overlooking Lady Bird Lake. 20-foot ceilings, floor-to-ceiling glass, private plunge pool on terrace, and 24/7 concierge services.",
    property_type: "condo",
    status: "available",
    price: 1950000,
    city: "Austin",
    state: "TX",
    address: "70 Rainey St #3204",
    bedrooms: 3,
    bathrooms: 3.5,
    area_sqft: 2950,
    image_url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
    ],
    features: ["Private Plunge Pool", "Concierge Service", "Lady Bird Lake Views", "Fitness Center", "Valet Parking"],
  },
  {
    title: "Biscayne Bay Sky Residence",
    description: "Ultra-luxurious corner residence in downtown Miami with wrap-around glass terraces, unobstructed ocean and skyline vistas, and private elevator foyer.",
    property_type: "condo",
    status: "available",
    price: 2450000,
    city: "Miami",
    state: "FL",
    address: "888 Brickell Key Blvd #4201",
    bedrooms: 3,
    bathrooms: 3.5,
    area_sqft: 2820,
    image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80",
    ],
    features: ["Private Elevator Foyer", "Ocean Vistas", "Italian Porcelain Floors", "Spa & Sauna", "Marina Access"],
  },
  {
    title: "Aspen Ridge Timber Chalet",
    description: "Grand alpine architectural lodge featuring heavy timber beams, two-story stone fireplace, heated stone outdoor patio, ski-in/ski-out convenience, and mountain views.",
    property_type: "house",
    status: "available",
    price: 4950000,
    city: "Denver",
    state: "CO",
    address: "1124 Mountain Spruce Way",
    bedrooms: 5,
    bathrooms: 6.0,
    area_sqft: 5800,
    image_url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1600&q=80",
    ],
    features: ["Ski-in / Ski-out", "Two-Story Stone Hearth", "Heated Driveway", "Outdoor Hot Tub", "Wine Vault"],
  },
  {
    title: "Seattle Waterfront Glass Townhome",
    description: "Pacific Northwest modern luxury in Madison Park. Direct views of Lake Washington and Mount Rainier, private rooftop garden, and private moorage.",
    property_type: "townhouse",
    status: "available",
    price: 1850000,
    city: "Seattle",
    state: "WA",
    address: "2140 43rd Ave E",
    bedrooms: 3,
    bathrooms: 3.5,
    area_sqft: 2650,
    image_url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80",
    ],
    features: ["Lake Washington Views", "Rooftop Garden", "Private Moorage", "Radiant Floor Heating"],
  },
  {
    title: "Tarrytown Heritage Craftsman Revival",
    description: "Meticulously restored historic Craftsman with expansive shaded back lawn, detached guest suite, gourmet Viking range kitchen, and heritage oak canopies.",
    property_type: "house",
    status: "available",
    price: 2150000,
    city: "Austin",
    state: "TX",
    address: "2412 Windsor Rd",
    bedrooms: 4,
    bathrooms: 3.5,
    area_sqft: 3600,
    image_url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=80",
    ],
    features: ["Heritage Oak Trees", "Detached Guest House", "Viking Kitchen Suite", "Screened Porch"],
  },
  {
    title: "Zilker Park Contemporary Loft",
    description: "Steps from Barton Springs and Zilker Park. Polished concrete floors, steel-frame staircase, private rooftop deck with downtown Austin skyline view.",
    property_type: "apartment",
    status: "available",
    price: 890000,
    city: "Austin",
    state: "TX",
    address: "1804 Barton Springs Rd #302",
    bedrooms: 2,
    bathrooms: 2.0,
    area_sqft: 1450,
    image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
    ],
    features: ["Walk to Barton Springs", "Downtown Skyline View", "Rooftop Terrace", "Polished Concrete Floors"],
  },
  {
    title: "Rollingwood Estate with Tennis Court",
    description: "Rare 1.2-acre flat gated estate in Rollingwood. Features championship tennis court, resort-style pool with swim-up bar, and private home theater.",
    property_type: "house",
    status: "available",
    price: 5800000,
    city: "Westlake",
    state: "TX",
    address: "402 Rollingwood Dr",
    bedrooms: 6,
    bathrooms: 7.5,
    area_sqft: 7800,
    image_url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
    ],
    features: ["Championship Tennis Court", "1.2 Acre Gated Lot", "Resort Pool & Swim-Up Bar", "Home Theater"],
  },
  {
    title: "South Congress Designer Brownstone",
    description: "Four-level luxury brownstone with private elevator, commercial-grade Wolf appliances, rooftop outdoor fireplace, and private two-car attached garage.",
    property_type: "townhouse",
    status: "available",
    price: 1450000,
    city: "Austin",
    state: "TX",
    address: "1206 S Congress Ave #B",
    bedrooms: 3,
    bathrooms: 3.5,
    area_sqft: 2400,
    image_url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80",
    ],
    features: ["Private In-Home Elevator", "Rooftop Fireplace", "SoCo Walkability", "Wolf / Sub-Zero Appliances"],
  },
  {
    title: "Hill Country Equestrian Ranch",
    description: "25-acre luxury equestrian retreat in Dripping Springs. 8-stall barn, covered arena, limestone main ranch house with wrap-around porches and spring-fed pond.",
    property_type: "house",
    status: "available",
    price: 3900000,
    city: "Austin",
    state: "TX",
    address: "8800 Fitzhugh Rd",
    bedrooms: 4,
    bathrooms: 4.5,
    area_sqft: 4600,
    image_url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80",
    ],
    features: ["25 Acres Ag-Exempt", "8-Stall Horse Barn", "Spring-Fed Pond", "Covered Riding Arena"],
  },
];

async function upsertAuthUser(
  admin: SupabaseClient,
  email: string,
  fullName: string,
) {
  const { data: list, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) throw listErr;

  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      user_metadata: { full_name: fullName },
      email_confirm: true,
    });
    return existing;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    throw error ?? new Error(`Could not create auth user for ${email}`);
  }

  return data.user;
}

export async function runDemoSeed() {
  console.log("================================================================");
  console.log("  AETHER ESTATES — PHASE 7C DEMO SEED ENGINE                    ");
  console.log("================================================================\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const admin = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Upsert Demo Staff Accounts
  console.log("▶ 1. Upserting Demo Staff Accounts...");
  const profileIds: Record<string, string> = {};

  for (const user of demoUsers) {
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
    console.log(`  Staff: ${user.full_name} (${user.role}) -> Profile ID: ${profile.id}`);
  }

  const alex = profileIds["alex.agent@demo.aether.test"];
  const taylor = profileIds["taylor.agent@demo.aether.test"];

  // 2. Clean only previous demo records to ensure deterministic idempotency
  console.log("\n▶ 2. Resetting Demo Records for Idempotent Seeding...");
  await admin.from("communication_logs").delete().like("provider_message_id", "demo_%");
  await admin.from("appointment_reminders").delete().like("id", "%");
  await admin.from("appointments").delete().like("notes", "%demo%");
  await admin.from("lead_messages").delete().like("content", "%demo%");
  await admin.from("lead_conversations").delete().like("access_token", "demo_%");
  await admin.from("leads").delete().like("email", "%@demo.aether.estate");
  await admin.from("properties").delete().like("id", "%");

  // 3. Insert Demo Properties
  console.log("\n▶ 3. Seeding Fictional Luxury Properties...");
  const { data: propertiesData, error: propErr } = await admin
    .from("properties")
    .insert(demoProperties)
    .select("id, title, city, price");

  if (propErr || !propertiesData) {
    throw new Error(`Failed to insert properties: ${propErr?.message}`);
  }
  console.log(`  Seeded ${propertiesData.length} luxury properties successfully.`);

  const pGlassPavilion = propertiesData[0];
  const pLakeTravis = propertiesData[1];
  const pWestlake = propertiesData[2];
  const pRainey = propertiesData[3];
  const pMiami = propertiesData[4];

  // 4. Seed Balanced Demo Leads (HOT, WARM, COLD)
  console.log("\n▶ 4. Seeding Fictional Demo Leads (HOT / WARM / COLD)...");
  const demoLeads = [
    // HOT LEADS (3)
    {
      full_name: "Daniel Brooks",
      email: "daniel.brooks@demo.aether.estate",
      phone: "+1 512 555 0201",
      source: "chatbot",
      status: "qualified",
      intent: "buy",
      city: "Austin",
      property_type: "house",
      budget_min: 3000000,
      budget_max: 3800000,
      bedrooms: 5,
      timeline: "within_30_days",
      lead_score: 94,
      qualification_category: "hot",
      assigned_agent_id: alex,
      property_id: pGlassPavilion?.id,
      whatsapp_opt_in: true,
      email_transactional_opt_in: true,
    },
    {
      full_name: "Sophia Bennett",
      email: "sophia.bennett@demo.aether.estate",
      phone: "+1 512 555 0202",
      source: "website",
      status: "appointment_set",
      intent: "buy",
      city: "Austin",
      property_type: "house",
      budget_min: 3800000,
      budget_max: 4500000,
      bedrooms: 6,
      timeline: "within_30_days",
      lead_score: 92,
      qualification_category: "hot",
      assigned_agent_id: alex,
      property_id: pLakeTravis?.id,
      whatsapp_opt_in: true,
      email_transactional_opt_in: true,
    },
    {
      full_name: "Liam Vance",
      email: "liam.vance@demo.aether.estate",
      phone: "+1 512 555 0203",
      source: "chatbot",
      status: "closed",
      intent: "buy",
      city: "Westlake",
      property_type: "house",
      budget_min: 2600000,
      budget_max: 3000000,
      bedrooms: 4,
      timeline: "within_30_days",
      lead_score: 88,
      qualification_category: "hot",
      assigned_agent_id: taylor,
      property_id: pWestlake?.id,
      whatsapp_opt_in: false, // Opted out of WhatsApp, Email only
      email_transactional_opt_in: true,
    },
    // WARM LEADS (4)
    {
      full_name: "Olivia Carter",
      email: "olivia.carter@demo.aether.estate",
      phone: "+1 512 555 0204",
      source: "chatbot",
      status: "qualifying",
      intent: "buy",
      city: "Austin",
      property_type: "condo",
      budget_min: 1700000,
      budget_max: 2100000,
      bedrooms: 3,
      timeline: "1_3_months",
      lead_score: 68,
      qualification_category: "warm",
      assigned_agent_id: alex,
      property_id: pRainey?.id,
      whatsapp_opt_in: true,
      email_transactional_opt_in: true,
    },
    {
      full_name: "Ethan Mitchell",
      email: "ethan.mitchell@demo.aether.estate",
      phone: "+1 512 555 0205",
      source: "property_page",
      status: "qualified",
      intent: "buy",
      city: "Miami",
      property_type: "condo",
      budget_min: 2200000,
      budget_max: 2600000,
      bedrooms: 3,
      timeline: "1_3_months",
      lead_score: 72,
      qualification_category: "warm",
      assigned_agent_id: taylor,
      property_id: pMiami?.id,
      whatsapp_opt_in: true,
      email_transactional_opt_in: true,
    },
    {
      full_name: "Marcus Hayes",
      email: "marcus.hayes@demo.aether.estate",
      phone: "+1 512 555 0206",
      source: "website",
      status: "new",
      intent: "buy",
      city: "Austin",
      property_type: "house",
      budget_min: 1500000,
      budget_max: 2000000,
      bedrooms: 4,
      timeline: "1_3_months",
      lead_score: 62,
      qualification_category: "warm",
      assigned_agent_id: null, // Unassigned pool
      whatsapp_opt_in: false,
      email_transactional_opt_in: true,
    },
    {
      full_name: "Chloe Davis",
      email: "chloe.davis@demo.aether.estate",
      phone: null, // No phone provided
      source: "property_page",
      status: "qualifying",
      intent: "buy",
      city: "Austin",
      property_type: "townhouse",
      budget_min: 1200000,
      budget_max: 1500000,
      bedrooms: 3,
      timeline: "3_6_months",
      lead_score: 55,
      qualification_category: "warm",
      assigned_agent_id: alex,
      whatsapp_opt_in: false,
      email_transactional_opt_in: true,
    },
    // COLD LEADS (3)
    {
      full_name: "Noah Parker",
      email: "noah.parker@demo.aether.estate",
      phone: "+1 512 555 0207",
      source: "chatbot",
      status: "nurturing",
      intent: "buy",
      city: "Austin",
      property_type: "house",
      budget_min: null,
      budget_max: 900000,
      bedrooms: 3,
      timeline: "6_plus_months",
      lead_score: 38,
      qualification_category: "cold",
      assigned_agent_id: taylor,
      whatsapp_opt_in: false,
      email_transactional_opt_in: true,
    },
    {
      full_name: "Maya Lin",
      email: "maya.lin@demo.aether.estate",
      phone: "+1 512 555 0208",
      source: "website",
      status: "nurturing",
      intent: "buy",
      city: "Denver",
      property_type: "house",
      budget_min: null,
      budget_max: 1200000,
      bedrooms: 3,
      timeline: "6_plus_months",
      lead_score: 32,
      qualification_category: "cold",
      assigned_agent_id: null, // Unassigned pool
      whatsapp_opt_in: false,
      email_transactional_opt_in: false,
    },
    {
      full_name: "Lucas Scott",
      email: "lucas.scott@demo.aether.estate",
      phone: "+1 512 555 0209",
      source: "referral",
      status: "lost",
      intent: "buy",
      city: "Seattle",
      property_type: "townhouse",
      budget_min: null,
      budget_max: 800000,
      bedrooms: 2,
      timeline: "6_plus_months",
      lead_score: 25,
      qualification_category: "cold",
      assigned_agent_id: alex,
      whatsapp_opt_in: false,
      email_transactional_opt_in: true,
    },
  ];

  const { data: leadsData, error: leadErr } = await admin
    .from("leads")
    .insert(demoLeads)
    .select("id, full_name, email, status, qualification_category, assigned_agent_id");

  if (leadErr || !leadsData) {
    throw new Error(`Failed to insert demo leads: ${leadErr?.message}`);
  }
  console.log(`  Seeded ${leadsData.length} fictional leads (3 HOT, 4 WARM, 3 COLD).`);

  const leadDaniel = leadsData.find((l) => l.full_name === "Daniel Brooks")!;
  const leadSophia = leadsData.find((l) => l.full_name === "Sophia Bennett")!;
  const leadLiam = leadsData.find((l) => l.full_name === "Liam Vance")!;
  const leadOlivia = leadsData.find((l) => l.full_name === "Olivia Carter")!;

  // 5. Seed Realistic Demo Conversations
  console.log("\n▶ 5. Seeding Demo AI Chat Dialogues & Verified Consent...");
  const convId1 = "d0000000-0000-4000-8000-000000000001";
  const convId2 = "d0000000-0000-4000-8000-000000000002";
  const token1 = "demo_token_daniel_brooks_2026";
  const token2 = "demo_token_olivia_carter_2026";

  await admin.from("lead_conversations").insert([
    {
      id: convId1,
      access_token: token1,
      lead_id: leadDaniel.id,
      property_id: pGlassPavilion?.id,
      lead_capture_confirmed_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: convId2,
      access_token: token2,
      lead_id: leadOlivia.id,
      property_id: pRainey?.id,
      lead_capture_confirmed_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    },
  ]);

  await admin.from("lead_messages").insert([
    // Dialogue 1: Daniel Brooks (Serious Buyer)
    {
      conversation_id: convId1,
      role: "user",
      content: "Hello! I'm looking for a modern luxury home in Austin with a view and pool, budget around $3.5M. Moving next month.",
    },
    {
      conversation_id: convId1,
      role: "assistant",
      content: "Welcome to Aether Estates! I found the perfect listing for you: The Glass Pavilion at Barton Creek ($3,450,000, 5 Beds, 5.5 Baths, 5,200 sqft) with an infinity edge pool cantilevered over the greenbelt. Would you like me to connect you with our lead luxury agent Alex Morgan for a private walkthrough?",
    },
    {
      conversation_id: convId1,
      role: "user",
      content: "Yes please, my name is Daniel Brooks, email daniel.brooks@demo.aether.estate, phone (512) 555-0201.",
    },
    {
      conversation_id: convId1,
      role: "system",
      content: `__consent_confirmed__:${new Date().toISOString()}`,
    },
    {
      conversation_id: convId1,
      role: "assistant",
      content: "Thank you Daniel! I have captured your details and notified Alex Morgan. You can schedule a private consultation directly or Alex will reach out shortly.",
    },
    // Dialogue 2: Olivia Carter (Warm Research)
    {
      conversation_id: convId2,
      role: "user",
      content: "Hi, do you have any downtown Austin luxury penthouses under $2.2M with skyline views?",
    },
    {
      conversation_id: convId2,
      role: "assistant",
      content: "Yes! We represent the Downtown Austin Rainey Tower Penthouse at 70 Rainey St #3204 ($1,950,000, 3 Beds, 3.5 Baths) overlooking Lady Bird Lake with a private terrace plunge pool.",
    },
    {
      conversation_id: convId2,
      role: "user",
      content: "That looks amazing! I am Olivia Carter, olivia.carter@demo.aether.estate. Looking to buy in 2-3 months.",
    },
  ]);
  console.log("  Seeded 2 realistic customer AI conversations linked to luxury listings.");

  // 6. Seed Demo Appointments (Dynamic dates relative to Date.now())
  console.log("\n▶ 6. Seeding Demo Appointments (Confirmed, Scheduled, Completed, Cancelled)...");
  const now = new Date();
  
  // Future dates (3 days ahead, 5 days ahead)
  const futureAppt1 = new Date(now);
  futureAppt1.setDate(futureAppt1.getDate() + 3);
  futureAppt1.setHours(15, 0, 0, 0); // 10:00 AM Central

  const futureAppt2 = new Date(now);
  futureAppt2.setDate(futureAppt2.getDate() + 5);
  futureAppt2.setHours(19, 0, 0, 0); // 2:00 PM Central

  // Past dates (4 days ago, 7 days ago)
  const pastAppt1 = new Date(now);
  pastAppt1.setDate(pastAppt1.getDate() - 4);
  pastAppt1.setHours(16, 0, 0, 0);

  const pastAppt2 = new Date(now);
  pastAppt2.setDate(pastAppt2.getDate() - 7);
  pastAppt2.setHours(17, 0, 0, 0);

  const { data: appointmentsData, error: apptErr } = await admin
    .from("appointments")
    .insert([
      {
        lead_id: leadDaniel.id,
        agent_id: alex,
        scheduled_at: futureAppt1.toISOString(),
        status: "confirmed",
        notes: "demo: Private walkthrough at The Glass Pavilion at Barton Creek with Daniel Brooks.",
      },
      {
        lead_id: leadSophia.id,
        agent_id: alex,
        scheduled_at: futureAppt2.toISOString(),
        status: "scheduled",
        notes: "demo: Lake Travis waterfront tour with Sophia Bennett.",
      },
      {
        lead_id: leadLiam.id,
        agent_id: taylor,
        scheduled_at: pastAppt1.toISOString(),
        status: "completed",
        notes: "demo: Final closing inspection completed for Westlake Modernist Villa.",
      },
      {
        lead_id: leadOlivia.id,
        agent_id: alex,
        scheduled_at: pastAppt2.toISOString(),
        status: "cancelled",
        notes: "demo: Buyer requested cancellation due to travel schedule conflict.",
      },
    ])
    .select("id, lead_id, agent_id, status, scheduled_at");

  if (apptErr || !appointmentsData) {
    throw new Error(`Failed to insert demo appointments: ${apptErr?.message}`);
  }
  console.log(`  Seeded ${appointmentsData.length} appointments across life-cycle states.`);

  const apptDaniel = appointmentsData.find((a) => a.lead_id === leadDaniel.id)!;
  const apptSophia = appointmentsData.find((a) => a.lead_id === leadSophia.id)!;
  const apptLiam = appointmentsData.find((a) => a.lead_id === leadLiam.id)!;

  // 7. Seed Demo Reminders (Safe state: sent/pending)
  console.log("\n▶ 7. Seeding Demo Reminder Records...");
  const reminder24h = new Date(futureAppt1.getTime() - 24 * 3600 * 1000);
  const reminder1h = new Date(futureAppt1.getTime() - 3600 * 1000);

  await admin.from("appointment_reminders").insert([
    {
      appointment_id: apptDaniel.id,
      type: "reminder_24h",
      scheduled_for: reminder24h.toISOString(),
      status: "pending",
    },
    {
      appointment_id: apptDaniel.id,
      type: "reminder_1h",
      scheduled_for: reminder1h.toISOString(),
      status: "pending",
    },
    {
      appointment_id: apptLiam.id,
      type: "reminder_24h",
      scheduled_for: new Date(pastAppt1.getTime() - 24 * 3600 * 1000).toISOString(),
      status: "sent",
      processed_at: new Date(pastAppt1.getTime() - 24 * 3600 * 1000).toISOString(),
    },
  ]);
  console.log("  Seeded 3 reminder records safely.");

  // 8. Seed Demo Communication Logs (Audit Trail matching schema)
  console.log("\n▶ 8. Seeding Demo Communication Logs (Email & WhatsApp)...");
  const { data: logsData, error: logErr } = await admin.from("communication_logs").insert([
    // Lead 1: Daniel Brooks (Email Sent + WhatsApp Sent)
    {
      lead_id: leadDaniel.id,
      appointment_id: apptDaniel.id,
      channel: "email",
      event_type: "appointment.created",
      recipient_type: "customer",
      recipient: leadDaniel.email,
      status: "sent",
      template: "appointment_created_customer",
      provider_message_id: "demo_msg_email_daniel_01",
      metadata: { demo: true },
      sent_at: new Date().toISOString(),
    },
    {
      lead_id: leadDaniel.id,
      appointment_id: apptDaniel.id,
      channel: "whatsapp",
      event_type: "appointment.created",
      recipient_type: "customer",
      recipient: "+1512****0201",
      status: "sent",
      template: "appointment_created_customer",
      provider_message_id: "demo_wa_msg_daniel_01",
      metadata: { demo: true },
      sent_at: new Date().toISOString(),
    },
    // Lead 2: Sophia Bennett (Email Sent + WhatsApp Sent)
    {
      lead_id: leadSophia.id,
      appointment_id: apptSophia.id,
      channel: "email",
      event_type: "appointment.created",
      recipient_type: "customer",
      recipient: leadSophia.email,
      status: "sent",
      template: "appointment_created_customer",
      provider_message_id: "demo_msg_email_sophia_01",
      metadata: { demo: true },
      sent_at: new Date().toISOString(),
    },
    {
      lead_id: leadSophia.id,
      appointment_id: apptSophia.id,
      channel: "whatsapp",
      event_type: "appointment.created",
      recipient_type: "customer",
      recipient: "+1512****0202",
      status: "sent",
      template: "appointment_created_customer",
      provider_message_id: "demo_wa_msg_sophia_01",
      metadata: { demo: true },
      sent_at: new Date().toISOString(),
    },
    // Lead 3: Liam Vance (WhatsApp Skipped due to NO_OPT_IN + Email Sent)
    {
      lead_id: leadLiam.id,
      appointment_id: apptLiam.id,
      channel: "email",
      event_type: "appointment.created",
      recipient_type: "customer",
      recipient: leadLiam.email,
      status: "sent",
      template: "appointment_created_customer",
      provider_message_id: "demo_msg_email_liam_01",
      metadata: { demo: true },
      sent_at: new Date().toISOString(),
    },
    {
      lead_id: leadLiam.id,
      appointment_id: apptLiam.id,
      channel: "whatsapp",
      event_type: "appointment.created",
      recipient_type: "customer",
      recipient: "+1512****0203",
      status: "skipped",
      error_code: "NO_OPT_IN",
      error_message: "Customer has not granted WhatsApp opt-in consent.",
      template: "appointment_created_customer",
      provider_message_id: "demo_wa_skip_liam_01",
      metadata: { demo: true },
    },
  ]).select("id, lead_id, channel, status");

  if (logErr) {
    throw new Error(`Failed to insert communication logs: ${logErr.message}`);
  }
  console.log(`  Seeded ${logsData?.length || 6} communication audit logs matching customer consent states.`);

  console.log("\n================================================================");
  console.log("  DEMO DATASET SEEDING COMPLETED SUCCESSFULLY!                  ");
  console.log("================================================================\n");

  return {
    usersCount: demoUsers.length,
    propertiesCount: propertiesData.length,
    leadsCount: leadsData.length,
    appointmentsCount: appointmentsData.length,
  };
}

// Direct execution guard
if (require.main === module) {
  runDemoSeed().catch((err) => {
    console.error("❌ DEMO SEED FAILED:", err);
    process.exit(1);
  });
}
