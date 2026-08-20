import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/site";
import type { Property } from "@/types/database";

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatPropertyType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function PropertyCard({ property }: { property: Property }) {
  const imageUrl =
    property.image_url ||
    (property.images && property.images.length > 0
      ? property.images[0]
      : "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80");

  const statusVariant =
    property.status === "available"
      ? "default"
      : property.status === "pending"
      ? "warning"
      : "neutral";

  const statusLabel =
    property.status === "available"
      ? "Available"
      : property.status === "pending"
      ? "Pending"
      : property.status === "sold"
      ? "Sold"
      : property.status;

  return (
    <div className="group flex flex-col overflow-hidden rounded-sm border border-brand-line/80 bg-brand-cream/60 transition-all duration-300 hover:border-brand-ink/40 hover:shadow-md">
      {/* Image container */}
      <Link
        href={routes.property(property.id)}
        className="relative aspect-4/3 w-full overflow-hidden bg-brand-sand/70 focus:outline-none focus:ring-2 focus:ring-brand-gold"
      >
        <Image
          src={imageUrl}
          alt={property.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/40 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant={statusVariant} className="shadow-xs backdrop-blur-xs">
            {statusLabel}
          </Badge>
          <span className="inline-flex items-center rounded-sm bg-brand-ink/80 px-2 py-0.5 text-[11px] font-medium tracking-wide text-brand-cream backdrop-blur-xs">
            {formatPropertyType(property.property_type)}
          </span>
        </div>

        {/* Price overlay on image bottom */}
        <div className="absolute bottom-3 left-3 right-3 flex items-baseline justify-between">
          <span className="font-serif text-2xl font-medium tracking-tight text-white drop-shadow-sm">
            {formatPrice(property.price)}
          </span>
        </div>
      </Link>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex-1">
          <p className="text-xs font-medium tracking-wide uppercase text-brand-gold">
            {property.city}, {property.state}
          </p>
          <h3 className="mt-1 font-serif text-xl font-normal leading-snug text-brand-ink transition-colors group-hover:text-brand-gold">
            <Link
              href={routes.property(property.id)}
              className="focus:outline-none focus:underline"
            >
              {property.title}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-brand-ink/60 line-clamp-1">
            {property.address}
          </p>

          {/* Specs Ribbon */}
          <div className="mt-4 flex items-center gap-3 border-t border-brand-line/60 pt-3 text-xs text-brand-ink/80">
            {property.bedrooms !== null && (
              <span className="flex items-center gap-1 font-medium">
                <span className="font-semibold text-brand-ink">
                  {property.bedrooms}
                </span>{" "}
                {property.bedrooms === 1 ? "Bed" : "Beds"}
              </span>
            )}
            {property.bedrooms !== null && property.bathrooms !== null && (
              <span className="text-brand-line">&bull;</span>
            )}
            {property.bathrooms !== null && (
              <span className="flex items-center gap-1 font-medium">
                <span className="font-semibold text-brand-ink">
                  {property.bathrooms}
                </span>{" "}
                {property.bathrooms === 1 ? "Bath" : "Baths"}
              </span>
            )}
            {property.bathrooms !== null && property.area_sqft !== null && (
              <span className="text-brand-line">&bull;</span>
            )}
            {property.area_sqft !== null && (
              <span className="flex items-center gap-1 font-medium">
                <span className="font-semibold text-brand-ink">
                  {property.area_sqft.toLocaleString()}
                </span>{" "}
                sqft
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5 border-t border-brand-line/40 pt-4">
          <Link href={routes.property(property.id)} className="block w-full">
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-center group-hover:bg-brand-ink group-hover:text-brand-cream"
            >
              View Property Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
