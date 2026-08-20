import { Suspense } from "react";
import Link from "next/link";
import { searchProperties, type PropertyFilterParams, type PropertySortOption } from "@/services/properties";
import { PropertyCard } from "@/components/properties/property-card";
import { PropertyFilters } from "@/components/properties/property-filters";
import { PropertySort } from "@/components/properties/property-sort";
import { PropertyPagination } from "@/components/properties/property-pagination";
import { Button } from "@/components/ui/button";
import { site, routes } from "@/config/site";
import type { Metadata } from "next";
import type { PropertyStatus, PropertyType } from "@/types/database";

export const metadata: Metadata = {
  title: `Properties Portfolio — ${site.name}`,
  description:
    "Explore our full collection of luxury estates, waterfront villas, modern lofts, and urban penthouses.",
};

export const dynamic = "force-dynamic";

interface PropertiesPageProps {
  searchParams: Promise<{
    location?: string;
    property_type?: string;
    min_price?: string;
    max_price?: string;
    bedrooms?: string;
    status?: string;
    sort_by?: string;
    page?: string;
  }>;
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const resolvedParams = await searchParams;

  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const minPrice = resolvedParams.min_price ? parseFloat(resolvedParams.min_price) : undefined;
  const maxPrice = resolvedParams.max_price ? parseFloat(resolvedParams.max_price) : undefined;
  const bedrooms = resolvedParams.bedrooms && resolvedParams.bedrooms !== "all"
    ? parseInt(resolvedParams.bedrooms, 10)
    : undefined;

  const filterParams: PropertyFilterParams = {
    location: resolvedParams.location,
    property_type: resolvedParams.property_type as PropertyType | "all" | undefined,
    min_price: minPrice,
    max_price: maxPrice,
    bedrooms,
    status: (resolvedParams.status as PropertyStatus | "all") || "available",
    sort_by: (resolvedParams.sort_by as PropertySortOption) || "recommended",
    page: isNaN(page) || page < 1 ? 1 : page,
    limit: 9,
  };

  const { properties, total, totalPages } = await searchProperties(filterParams);

  const hasFilters =
    Boolean(resolvedParams.location) ||
    Boolean(resolvedParams.property_type && resolvedParams.property_type !== "all") ||
    Boolean(resolvedParams.min_price) ||
    Boolean(resolvedParams.max_price) ||
    Boolean(resolvedParams.bedrooms && resolvedParams.bedrooms !== "all") ||
    Boolean(resolvedParams.status && resolvedParams.status !== "available");

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      {/* Header */}
      <div className="max-w-2xl">
        <p className="text-xs font-semibold tracking-widest uppercase text-brand-gold">
          Property Discovery
        </p>
        <h1 className="mt-2 font-serif text-3xl sm:text-5xl font-normal text-brand-ink">
          Properties Portfolio
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-brand-ink/70">
          Browse our curated catalog of luxury homes, architectural penthouses, and modern townhomes.
        </p>
      </div>

      {/* Filter Section */}
      <div className="mt-8">
        <Suspense fallback={<div className="h-20 bg-brand-sand/30 animate-pulse rounded-sm" />}>
          <PropertyFilters />
        </Suspense>
      </div>

      {/* Results Controls Header */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-brand-line/80 pb-4">
        <p className="text-xs font-medium text-brand-ink/70">
          Found <span className="font-semibold text-brand-ink">{total}</span>{" "}
          {total === 1 ? "property" : "properties"}
        </p>
        <Suspense fallback={null}>
          <PropertySort />
        </Suspense>
      </div>

      {/* Listing Grid / Empty State */}
      <div className="mt-8">
        {properties.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="rounded-sm border border-brand-line bg-brand-sand/30 px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-sand text-brand-ink/60 mb-4">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="font-serif text-xl font-medium text-brand-ink">
              No properties match your search
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-brand-ink/70">
              We couldn&apos;t find any properties matching your current criteria. Try expanding your search parameters or resetting filters.
            </p>
            {hasFilters && (
              <div className="mt-6">
                <Link href={routes.properties}>
                  <Button variant="secondary" size="sm">
                    Clear All Filters
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-12">
        <Suspense fallback={null}>
          <PropertyPagination
            total={total}
            page={filterParams.page || 1}
            limit={filterParams.limit || 9}
            totalPages={totalPages}
          />
        </Suspense>
      </div>
    </div>
  );
}
