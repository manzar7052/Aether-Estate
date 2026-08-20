import { notFound } from "next/navigation";
import Link from "next/link";
import { getPropertyById, getSimilarProperties } from "@/services/properties";
import { PropertyGallery } from "@/components/properties/property-gallery";
import { PropertyCard, formatPrice, formatPropertyType } from "@/components/properties/property-card";
import { LeadInquiryForm } from "@/components/properties/lead-inquiry-form";
import { LeadInquiryModal } from "@/components/properties/lead-inquiry-modal";
import { TalkToExpertButton } from "@/components/home/talk-to-expert-button";
import { Badge } from "@/components/ui/badge";
import { site, routes } from "@/config/site";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PropertyDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await getPropertyById(id);

  if (!property) {
    return {
      title: `Property Not Found — ${site.name}`,
    };
  }

  const imageUrl =
    property.image_url ||
    (property.images && property.images.length > 0 ? property.images[0] : undefined);

  return {
    title: `${property.title} — ${property.city}, ${property.state} | ${site.name}`,
    description:
      property.description ||
      `Explore ${property.title}, a ${property.bedrooms ?? ""}-bed luxury ${property.property_type} in ${property.city}, ${property.state}.`,
    openGraph: {
      title: `${property.title} — ${formatPrice(property.price)}`,
      description:
        property.description ||
        `Curated luxury listing in ${property.city}, ${property.state}.`,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
  };
}

export default async function PropertyDetailPage({
  params,
}: PropertyDetailPageProps) {
  const { id } = await params;
  const property = await getPropertyById(id);

  if (!property) {
    notFound();
  }

  const similarProperties = await getSimilarProperties(
    property.id,
    property.city,
    3,
  );

  // Gallery photos
  const galleryImages =
    property.images && property.images.length > 0
      ? property.images
      : property.image_url
      ? [property.image_url]
      : [
          "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
        ];

  const pricePerSqft =
    property.area_sqft && property.area_sqft > 0
      ? Math.round(property.price / property.area_sqft)
      : null;

  const statusVariant =
    property.status === "available"
      ? "default"
      : property.status === "pending"
      ? "warning"
      : "neutral";

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:py-12">
      {/* Breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-brand-ink/60">
        <Link href={routes.home} className="hover:text-brand-ink transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href={routes.properties} className="hover:text-brand-ink transition-colors">
          Properties
        </Link>
        <span>/</span>
        <span className="text-brand-ink font-medium truncate max-w-xs sm:max-w-md">
          {property.title}
        </span>
      </nav>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        {/* Left Column: Gallery, Specs, Description, Features */}
        <div className="lg:col-span-2 space-y-10">
          {/* Gallery */}
          <PropertyGallery images={galleryImages} title={property.title} />

          {/* Title & Price Header */}
          <div className="border-b border-brand-line/80 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={statusVariant}>
                    {property.status === "available"
                      ? "Available"
                      : property.status === "pending"
                      ? "Pending"
                      : property.status === "sold"
                      ? "Sold"
                      : property.status}
                  </Badge>
                  <span className="text-xs font-semibold tracking-wider uppercase text-brand-gold">
                    {formatPropertyType(property.property_type)}
                  </span>
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl font-normal text-brand-ink">
                  {property.title}
                </h1>
                <p className="mt-1 text-sm text-brand-ink/70">
                  {property.address}, {property.city}, {property.state}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="font-serif text-3xl sm:text-4xl font-medium text-brand-ink">
                  {formatPrice(property.price)}
                </p>
                {pricePerSqft && (
                  <p className="mt-1 text-xs text-brand-ink/60">
                    ${pricePerSqft} / sqft
                  </p>
                )}
              </div>
            </div>

            {/* Quick Specs Bar */}
            <div className="mt-8 grid grid-cols-2 gap-4 rounded-sm border border-brand-line bg-brand-sand/40 p-4 sm:grid-cols-4">
              <div className="text-center sm:border-r sm:border-brand-line/60">
                <p className="text-[11px] font-semibold tracking-wider uppercase text-brand-ink/60">
                  Bedrooms
                </p>
                <p className="mt-1 font-serif text-xl font-medium text-brand-ink">
                  {property.bedrooms ?? "—"}
                </p>
              </div>
              <div className="text-center sm:border-r sm:border-brand-line/60">
                <p className="text-[11px] font-semibold tracking-wider uppercase text-brand-ink/60">
                  Bathrooms
                </p>
                <p className="mt-1 font-serif text-xl font-medium text-brand-ink">
                  {property.bathrooms ?? "—"}
                </p>
              </div>
              <div className="text-center sm:border-r sm:border-brand-line/60">
                <p className="text-[11px] font-semibold tracking-wider uppercase text-brand-ink/60">
                  Living Area
                </p>
                <p className="mt-1 font-serif text-xl font-medium text-brand-ink">
                  {property.area_sqft ? `${property.area_sqft.toLocaleString()} sqft` : "—"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[11px] font-semibold tracking-wider uppercase text-brand-ink/60">
                  Property Type
                </p>
                <p className="mt-1 font-serif text-xl font-medium text-brand-ink">
                  {formatPropertyType(property.property_type)}
                </p>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-normal text-brand-ink">
              About This Property
            </h2>
            <p className="text-sm leading-relaxed text-brand-ink/80 whitespace-pre-line">
              {property.description ||
                "An exceptional residence curated for discerning buyers seeking privacy, architectural excellence, and premier finishes."}
            </p>
          </div>

          {/* Features & Amenities */}
          {property.features && property.features.length > 0 && (
            <div className="space-y-4 border-t border-brand-line/80 pt-8">
              <h2 className="font-serif text-2xl font-normal text-brand-ink">
                Features & Amenities
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {property.features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 rounded-sm border border-brand-line bg-brand-sand/20 p-3 text-xs font-medium text-brand-ink"
                  >
                    <svg
                      className="h-4 w-4 shrink-0 text-brand-gold"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location & Neighborhood info */}
          <div className="space-y-4 border-t border-brand-line/80 pt-8">
            <h2 className="font-serif text-2xl font-normal text-brand-ink">
              Location & Neighborhood
            </h2>
            <div className="rounded-sm border border-brand-line bg-brand-sand/30 p-6 space-y-2">
              <p className="font-semibold text-sm text-brand-ink">
                {property.address}
              </p>
              <p className="text-xs text-brand-ink/70">
                {property.city}, {property.state} &bull; United States
              </p>
              <p className="pt-2 text-xs leading-relaxed text-brand-ink/60">
                Located in the desirable {property.city} sub-market, offering seamless access to premier dining, architectural landmarks, and local nature corridors.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Lead Capture Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Lead Form Card */}
            <div className="rounded-sm border border-brand-line/80 bg-brand-sand/40 p-6 shadow-sm">
              <div className="mb-4">
                <p className="text-[11px] font-semibold tracking-wider uppercase text-brand-gold">
                  Inquire Directly
                </p>
                <h3 className="mt-1 font-serif text-xl font-normal text-brand-ink">
                  Request Property Details
                </h3>
                <p className="mt-1 text-xs text-brand-ink/70">
                  Connect directly with our advisory specialist for pricing, private showings, or floorplans.
                </p>
              </div>

              {/* Inquiry Form */}
              <LeadInquiryForm
                propertyId={property.id}
                propertyTitle={property.title}
                defaultIntent="buy"
              />

              {/* Schedule Viewing CTA */}
              <div className="mt-6 border-t border-brand-line/60 pt-4">
                <LeadInquiryModal
                  propertyId={property.id}
                  propertyTitle={property.title}
                  triggerText="Schedule a Viewing"
                  triggerVariant="secondary"
                  modalTitle="Schedule a Private Walkthrough"
                  defaultIntent="buy"
                  className="w-full justify-center text-xs"
                />
              </div>
            </div>

            {/* Concierge Note */}
            <div className="rounded-sm border border-brand-line/60 bg-brand-cream p-4 text-xs text-brand-ink/70 space-y-2">
              <p className="font-medium text-brand-ink">
                Aether Concierge Advisory
              </p>
              <p className="text-[11px] leading-relaxed">
                Dedicated representation with transparent disclosures, verified square footage, and direct agent communication.
              </p>
              <div className="pt-1 border-t border-brand-line/40">
                <TalkToExpertButton
                  variant="ghost"
                  size="sm"
                  initialQuery={`Tell me more about ${property.title} in ${property.city}`}
                  className="w-full justify-center text-xs font-semibold text-brand-gold hover:text-brand-ink hover:bg-brand-sand/50 h-8"
                >
                  Chat with Concierge about this home &rarr;
                </TalkToExpertButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Properties Section */}
      {similarProperties.length > 0 && (
        <section className="mt-20 border-t border-brand-line/80 pt-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-brand-gold">
                More in {property.city}
              </p>
              <h2 className="mt-1 font-serif text-2xl sm:text-3xl text-brand-ink">
                Similar Properties
              </h2>
            </div>
            <Link
              href={`/properties?location=${encodeURIComponent(property.city)}`}
              className="text-xs font-semibold uppercase tracking-wider text-brand-ink hover:text-brand-gold transition-colors"
            >
              View More &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {similarProperties.map((sim) => (
              <PropertyCard key={sim.id} property={sim} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
