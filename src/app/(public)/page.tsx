import Link from "next/link";
import { getFeaturedProperties, getFeaturedLocations } from "@/services/properties";
import { PropertyCard } from "@/components/properties/property-card";
import { HeroSearch } from "@/components/home/hero-search";
import { FeaturedLocations } from "@/components/home/featured-locations";
import { WhyUs } from "@/components/home/why-us";
import { HowItWorks } from "@/components/home/how-it-works";
import { CtaBanner } from "@/components/home/cta-banner";
import { TalkToExpertButton } from "@/components/home/talk-to-expert-button";
import { Button } from "@/components/ui/button";
import { site, routes } from "@/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featuredProperties, featuredLocations] = await Promise.all([
    getFeaturedProperties(3),
    getFeaturedLocations(),
  ]);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-sand/50 pt-16 pb-24 lg:pt-24 lg:pb-32 border-b border-brand-line/60">
        {/* Subtle background decorative pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#ddd4c5_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-widest uppercase text-brand-gold">
              Aether Estates &bull; Portfolio Collection
            </p>
            <h1 className="mt-4 font-serif text-4xl sm:text-6xl font-normal leading-[1.15] tracking-tight text-brand-ink">
              {site.tagline}
            </h1>
            <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-brand-ink/75">
              Discover curated luxury residences, architectural mountain chalets, and modern city lofts. Designed with trusted real-estate guidance and effortless property discovery.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={routes.properties}>
                <Button size="lg">Explore Properties</Button>
              </Link>
              <TalkToExpertButton size="lg" variant="secondary" />
            </div>
          </div>

          {/* Hero Quick Search Card */}
          <div className="mt-14">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Featured Properties Showcase */}
      <section className="py-20 bg-brand-cream">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-brand-gold">
                Curated Selection
              </p>
              <h2 className="mt-2 font-serif text-3xl text-brand-ink sm:text-4xl">
                Featured Properties
              </h2>
              <p className="mt-2 max-w-xl text-sm text-brand-ink/70">
                Explore our handpicked luxury residences available for immediate acquisition.
              </p>
            </div>
            <Link
              href={routes.properties}
              className="text-xs font-semibold uppercase tracking-wider text-brand-ink hover:text-brand-gold transition-colors inline-flex items-center gap-1"
            >
              View All {featuredProperties.length > 0 ? "Listings" : "Catalog"} &rarr;
            </Link>
          </div>

          {featuredProperties.length > 0 ? (
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="mt-12 rounded-sm border border-brand-line bg-brand-sand/30 p-12 text-center">
              <p className="font-serif text-lg text-brand-ink">
                No featured properties loaded yet.
              </p>
              <p className="mt-2 text-xs text-brand-ink/60">
                Run <code className="rounded bg-brand-sand px-1.5 py-0.5">npm run seed</code> to populate the database with demo listings.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Aether Estates */}
      <WhyUs />

      {/* How It Works */}
      <HowItWorks />

      {/* Featured Locations */}
      <FeaturedLocations locations={featuredLocations} />

      {/* Call to Action Banner */}
      <CtaBanner />
    </div>
  );
}
