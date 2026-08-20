export const site = {
  name: "Aether Estates",
  tagline: "Find a place that feels like home.",
  product: "AI Real Estate Lead Automation Platform",
  description:
    "Curated luxury residences, modern city lofts, and scenic architectural estates with dedicated real-estate guidance.",
  disclaimer:
    "Aether Estates is a fictional portfolio project demonstrating modern web architecture, property discovery, and lead automation.",
} as const;

export const routes = {
  home: "/",
  properties: "/properties",
  property: (id: string) => `/properties/${id}`,
  login: "/login",
  signup: "/signup",
  admin: "/admin",
  dashboard: "/dashboard",
  leads: "/dashboard/leads",
  unauthorized: "/unauthorized",
} as const;

export const navLinks = [
  { label: "Properties", href: "/properties" },
  { label: "Locations", href: "/#locations" },
  { label: "Why Us", href: "/#why-us" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Contact", href: "/#contact" },
] as const;

export const DEMO_PASSWORD_HINT =
  "See docs/development-phases.md for demo account emails after seeding.";
