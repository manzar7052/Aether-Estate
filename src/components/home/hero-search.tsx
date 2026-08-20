"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function HeroSearch() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("all");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();

    if (location.trim()) params.set("location", location.trim());
    if (propertyType !== "all") params.set("property_type", propertyType);
    if (maxPrice && Number(maxPrice) > 0) params.set("max_price", maxPrice);
    if (bedrooms !== "all") params.set("bedrooms", bedrooms);

    router.push(`/properties?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-5xl rounded-sm border border-brand-line/80 bg-brand-cream/95 p-4 shadow-xl backdrop-blur-md sm:p-6">
      <form onSubmit={handleSearch} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        {/* Location */}
        <div className="space-y-1.5 lg:col-span-1">
          <label
            htmlFor="hero-location"
            className="block text-[11px] font-semibold tracking-wider uppercase text-brand-ink/70"
          >
            Location
          </label>
          <input
            id="hero-location"
            type="text"
            placeholder="Austin, Miami, Denver..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="flex h-11 w-full rounded-sm border border-brand-line bg-white/90 px-3 py-2 text-sm text-brand-ink placeholder:text-brand-ink/40 focus:border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-gold"
          />
        </div>

        {/* Property Type */}
        <div className="space-y-1.5">
          <label
            htmlFor="hero-type"
            className="block text-[11px] font-semibold tracking-wider uppercase text-brand-ink/70"
          >
            Property Type
          </label>
          <select
            id="hero-type"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="flex h-11 w-full rounded-sm border border-brand-line bg-white/90 px-3 py-2 text-sm text-brand-ink focus:border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-gold"
          >
            <option value="all">All Types</option>
            <option value="house">House</option>
            <option value="condo">Condo</option>
            <option value="apartment">Apartment</option>
            <option value="townhouse">Townhouse</option>
          </select>
        </div>

        {/* Bedrooms */}
        <div className="space-y-1.5">
          <label
            htmlFor="hero-bedrooms"
            className="block text-[11px] font-semibold tracking-wider uppercase text-brand-ink/70"
          >
            Bedrooms
          </label>
          <select
            id="hero-bedrooms"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className="flex h-11 w-full rounded-sm border border-brand-line bg-white/90 px-3 py-2 text-sm text-brand-ink focus:border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-gold"
          >
            <option value="all">Any Beds</option>
            <option value="1">1+ Bed</option>
            <option value="2">2+ Beds</option>
            <option value="3">3+ Beds</option>
            <option value="4">4+ Beds</option>
          </select>
        </div>

        {/* Max Budget */}
        <div className="space-y-1.5">
          <label
            htmlFor="hero-budget"
            className="block text-[11px] font-semibold tracking-wider uppercase text-brand-ink/70"
          >
            Max Budget
          </label>
          <select
            id="hero-budget"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="flex h-11 w-full rounded-sm border border-brand-line bg-white/90 px-3 py-2 text-sm text-brand-ink focus:border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-gold"
          >
            <option value="">Any Budget</option>
            <option value="1000000">Up to $1,000,000</option>
            <option value="2000000">Up to $2,000,000</option>
            <option value="3500000">Up to $3,500,000</option>
            <option value="5000000">Up to $5,000,000</option>
          </select>
        </div>

        {/* Search CTA */}
        <div>
          <Button type="submit" size="lg" className="h-11 w-full justify-center text-sm font-medium">
            Search Properties
          </Button>
        </div>
      </form>
    </div>
  );
}
