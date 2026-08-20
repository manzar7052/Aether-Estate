"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const propertyTypes = [
  { value: "all", label: "All Property Types" },
  { value: "house", label: "House / Villa" },
  { value: "apartment", label: "Apartment / Loft" },
  { value: "condo", label: "Condo / Penthouse" },
  { value: "townhouse", label: "Townhouse" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

const bedroomOptions = [
  { value: "all", label: "Any Bedrooms" },
  { value: "1", label: "1+ Bed" },
  { value: "2", label: "2+ Beds" },
  { value: "3", label: "3+ Beds" },
  { value: "4", label: "4+ Beds" },
  { value: "5", label: "5+ Beds" },
];

const statusOptions = [
  { value: "available", label: "Available Only" },
  { value: "pending", label: "Pending" },
  { value: "sold", label: "Sold" },
  { value: "all", label: "All Statuses" },
];

export function PropertyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [propertyType, setPropertyType] = useState(
    searchParams.get("property_type") || "all",
  );
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");
  const [bedrooms, setBedrooms] = useState(
    searchParams.get("bedrooms") || "all",
  );
  const [status, setStatus] = useState(searchParams.get("status") || "available");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const applyFilters = (overrides = {}) => {
    const current = new URLSearchParams(searchParams.toString());

    const values = {
      location,
      property_type: propertyType,
      min_price: minPrice,
      max_price: maxPrice,
      bedrooms,
      status,
      ...overrides,
    };

    if (values.location && values.location.trim()) {
      current.set("location", values.location.trim());
    } else {
      current.delete("location");
    }

    if (values.property_type && values.property_type !== "all") {
      current.set("property_type", values.property_type);
    } else {
      current.delete("property_type");
    }

    if (values.min_price && Number(values.min_price) > 0) {
      current.set("min_price", values.min_price);
    } else {
      current.delete("min_price");
    }

    if (values.max_price && Number(values.max_price) > 0) {
      current.set("max_price", values.max_price);
    } else {
      current.delete("max_price");
    }

    if (values.bedrooms && values.bedrooms !== "all") {
      current.set("bedrooms", values.bedrooms);
    } else {
      current.delete("bedrooms");
    }

    if (values.status && values.status !== "available") {
      current.set("status", values.status);
    } else {
      current.delete("status");
    }

    // Reset page to 1 whenever filters change
    current.delete("page");

    startTransition(() => {
      router.push(`/properties?${current.toString()}`);
    });
    setIsMobileOpen(false);
  };

  const handleClear = () => {
    setLocation("");
    setPropertyType("all");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("all");
    setStatus("available");
    startTransition(() => {
      router.push("/properties");
    });
    setIsMobileOpen(false);
  };

  const hasActiveFilters =
    Boolean(searchParams.get("location")) ||
    (searchParams.get("property_type") && searchParams.get("property_type") !== "all") ||
    Boolean(searchParams.get("min_price")) ||
    Boolean(searchParams.get("max_price")) ||
    (searchParams.get("bedrooms") && searchParams.get("bedrooms") !== "all") ||
    (searchParams.get("status") && searchParams.get("status") !== "available");

  return (
    <div className="w-full">
      {/* Mobile Filter Toggle Button */}
      <div className="flex items-center justify-between lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex items-center gap-2 rounded-sm border border-brand-line bg-brand-cream px-4 py-2 text-sm font-medium text-brand-ink hover:bg-brand-sand"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span>{isMobileOpen ? "Hide Filters" : "Filter Properties"}</span>
          {hasActiveFilters && (
            <span className="h-2 w-2 rounded-full bg-brand-gold" />
          )}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-brand-ink/70 hover:text-brand-ink underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Filter Panel (desktop static / mobile toggle) */}
      <div
        className={`rounded-sm border border-brand-line/80 bg-brand-sand/40 p-5 lg:block ${
          isMobileOpen ? "block" : "hidden"
        }`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end"
        >
          {/* Location */}
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="filter-location" className="text-xs uppercase tracking-wider text-brand-ink/70">
              Location / City
            </Label>
            <Input
              id="filter-location"
              type="text"
              placeholder="e.g. Austin, Miami, Seattle"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-white/80 text-sm"
            />
          </div>

          {/* Property Type */}
          <div className="space-y-1.5">
            <Label htmlFor="filter-type" className="text-xs uppercase tracking-wider text-brand-ink/70">
              Type
            </Label>
            <select
              id="filter-type"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="flex h-10 w-full rounded-sm border border-brand-line bg-white/80 px-3 py-2 text-sm text-brand-ink focus:border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-gold"
            >
              {propertyTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Bedrooms */}
          <div className="space-y-1.5">
            <Label htmlFor="filter-bedrooms" className="text-xs uppercase tracking-wider text-brand-ink/70">
              Bedrooms
            </Label>
            <select
              id="filter-bedrooms"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="flex h-10 w-full rounded-sm border border-brand-line bg-white/80 px-3 py-2 text-sm text-brand-ink focus:border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-gold"
            >
              {bedroomOptions.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Max Price */}
          <div className="space-y-1.5">
            <Label htmlFor="filter-max-price" className="text-xs uppercase tracking-wider text-brand-ink/70">
              Max Budget ($)
            </Label>
            <Input
              id="filter-max-price"
              type="number"
              placeholder="e.g. 2000000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="bg-white/80 text-sm"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 justify-center text-sm"
            >
              {isPending ? "Filtering..." : "Search"}
            </Button>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClear}
                className="px-3 text-xs"
                title="Reset all filters"
              >
                Reset
              </Button>
            )}
          </div>
        </form>

        {/* Secondary row with Status toggle */}
        <div className="mt-4 flex flex-wrap items-center justify-between border-t border-brand-line/60 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-brand-ink/60 font-medium">Status:</span>
            <div className="flex items-center gap-1.5">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setStatus(opt.value);
                    applyFilters({ status: opt.value });
                  }}
                  className={`rounded-sm px-2.5 py-1 text-xs transition-colors ${
                    status === opt.value
                      ? "bg-brand-ink text-brand-cream font-medium"
                      : "bg-brand-cream/80 text-brand-ink/70 hover:bg-brand-sand hover:text-brand-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
