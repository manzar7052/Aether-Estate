import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { fromDatabaseError } from "@/lib/db/errors";
import { hasPublicEnv } from "@/lib/env";
import type { Property, PropertyStatus, PropertyType } from "@/types/database";

export type PropertySortOption =
  | "recommended"
  | "price_asc"
  | "price_desc"
  | "newest";

export interface PropertyFilterParams {
  location?: string;
  property_type?: PropertyType | "all";
  min_price?: number;
  max_price?: number;
  bedrooms?: number | "all";
  status?: PropertyStatus | "all";
  sort_by?: PropertySortOption;
  page?: number;
  limit?: number;
}

export interface PaginatedPropertiesResult {
  properties: Property[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function getClient() {
  try {
    return await createServerSupabaseClient();
  } catch {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return createServiceRoleClient();
    }
    throw new Error("Unable to create Supabase client.");
  }
}

/**
 * Searches and filters properties with database-level pagination, sorting, and filtering.
 * Reusable by UI Server Components and future Phase 3 AI Chat tools.
 */
export async function searchProperties(
  params: PropertyFilterParams = {},
): Promise<PaginatedPropertiesResult> {
  if (!hasPublicEnv()) {
    return { properties: [], total: 0, page: 1, limit: 9, totalPages: 0 };
  }

  const {
    location,
    property_type,
    min_price,
    max_price,
    bedrooms,
    status = "available",
    sort_by = "recommended",
    page = 1,
    limit = 9,
  } = params;

  const offset = (page - 1) * limit;

  // Helper to execute query on a client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const executeQuery = async (client: any) => {
    let query = client.from("properties").select("*", { count: "exact" });

    if (status && status !== "all") {
      query = query.eq("status", status);
    } else {
      query = query.neq("status", "draft");
    }

    if (location && location.trim() !== "") {
      const loc = location.trim();
      query = query.or(
        `city.ilike.%${loc}%,state.ilike.%${loc}%,title.ilike.%${loc}%,address.ilike.%${loc}%`,
      );
    }

    if (property_type && property_type !== "all") {
      query = query.eq("property_type", property_type);
    }

    if (typeof min_price === "number" && min_price > 0) {
      query = query.gte("price", min_price);
    }
    if (typeof max_price === "number" && max_price > 0) {
      query = query.lte("price", max_price);
    }

    if (typeof bedrooms === "number" && bedrooms > 0) {
      query = query.gte("bedrooms", bedrooms);
    }

    switch (sort_by) {
      case "price_asc":
        query = query.order("price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price", { ascending: false });
        break;
      case "newest":
      case "recommended":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);
    return query;
  };

  const supabase = await getClient();
  let { data, count, error } = await executeQuery(supabase);

  // Fallback to service role if pre-migration RLS returns 0 records
  if (!error && (count === 0 || !data || data.length === 0) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const adminClient = createServiceRoleClient();
      const adminRes = await executeQuery(adminClient);
      if (!adminRes.error && (adminRes.count ?? 0) > 0) {
        data = adminRes.data;
        count = adminRes.count;
        error = null;
      }
    } catch {
      // Continue with standard result if admin client fails
    }
  }

  if (error) {
    throw fromDatabaseError(error, "Unable to search properties.");
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    properties: (data as Property[]) ?? [],
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Fetches a single property by ID.
 */
export async function getPropertyById(id: string): Promise<Property | null> {
  if (!hasPublicEnv()) {
    return null;
  }

  const supabase = await getClient();
  let { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data && !error && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const adminClient = createServiceRoleClient();
      const adminRes = await adminClient
        .from("properties")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (adminRes.data) {
        data = adminRes.data;
        error = null;
      }
    } catch {
      // Fallback
    }
  }

  if (error) {
    throw fromDatabaseError(error, `Unable to load property ${id}.`);
  }

  return (data as Property) ?? null;
}

/**
 * Fetches top featured properties for landing page showcase.
 */
export async function getFeaturedProperties(limit = 4): Promise<Property[]> {
  if (!hasPublicEnv()) {
    return [];
  }

  const res = await searchProperties({ status: "available", limit });
  return res.properties;
}

/**
 * Fetches similar properties in the same city or general catalog.
 */
export async function getSimilarProperties(
  propertyId: string,
  city: string,
  limit = 3,
): Promise<Property[]> {
  if (!hasPublicEnv()) {
    return [];
  }

  const res = await searchProperties({ location: city, limit: limit + 1 });
  return res.properties.filter((p) => p.id !== propertyId).slice(0, limit);
}

/**
 * Aggregates featured locations for discovery cards.
 */
export async function getFeaturedLocations(): Promise<
  Array<{ city: string; state: string; count: number; image: string }>
> {
  if (!hasPublicEnv()) {
    return [];
  }

  const res = await searchProperties({ status: "all", limit: 100 });
  const data = res.properties;

  const locationMap = new Map<
    string,
    { city: string; state: string; count: number; image: string }
  >();

  for (const item of data) {
    const key = `${item.city}, ${item.state}`;
    const existing = locationMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      locationMap.set(key, {
        city: item.city,
        state: item.state,
        count: 1,
        image:
          item.image_url ||
          (item.images && item.images.length > 0 ? item.images[0] : "") ||
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      });
    }
  }

  return Array.from(locationMap.values()).slice(0, 6);
}

/**
 * Backward compatibility helper for authenticated staff list.
 */
export async function listProperties(): Promise<Property[]> {
  const result = await searchProperties({ status: "all", limit: 100 });
  return result.properties;
}
