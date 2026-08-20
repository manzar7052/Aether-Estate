import Image from "next/image";
import Link from "next/link";

interface LocationItem {
  city: string;
  state: string;
  count: number;
  image: string;
}

const defaultLocations: LocationItem[] = [
  {
    city: "Austin",
    state: "TX",
    count: 3,
    image:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
  },
  {
    city: "Miami",
    state: "FL",
    count: 2,
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
  },
  {
    city: "Denver",
    state: "CO",
    count: 3,
    image:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
  },
  {
    city: "Seattle",
    state: "WA",
    count: 2,
    image:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
  },
  {
    city: "Dallas",
    state: "TX",
    count: 2,
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  },
  {
    city: "San Francisco",
    state: "CA",
    count: 2,
    image:
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
  },
];

export function FeaturedLocations({
  locations = defaultLocations,
}: {
  locations?: LocationItem[];
}) {
  const displayLocations = locations.length > 0 ? locations : defaultLocations;

  return (
    <section id="locations" className="py-20 bg-brand-sand/30 border-y border-brand-line/60">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-brand-gold">
              Premier Markets
            </p>
            <h2 className="mt-2 font-serif text-3xl text-brand-ink sm:text-4xl">
              Featured Locations
            </h2>
            <p className="mt-2 max-w-xl text-sm text-brand-ink/70">
              Explore hand-selected properties across prime metropolitan centers and scenic retreat destinations.
            </p>
          </div>
          <Link
            href="/properties"
            className="text-xs font-semibold uppercase tracking-wider text-brand-ink hover:text-brand-gold transition-colors inline-flex items-center gap-1"
          >
            Explore All Markets &rarr;
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayLocations.map((loc) => (
            <Link
              key={`${loc.city}-${loc.state}`}
              href={`/properties?location=${encodeURIComponent(loc.city)}`}
              className="group relative aspect-16/10 overflow-hidden rounded-sm border border-brand-line bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold"
            >
              <Image
                src={loc.image}
                alt={`${loc.city}, ${loc.state}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 opacity-80 group-hover:opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/90 via-brand-ink/30 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-6 flex items-end justify-between">
                <div>
                  <p className="text-xs font-medium tracking-wider uppercase text-brand-gold">
                    {loc.state}
                  </p>
                  <h3 className="font-serif text-2xl font-normal text-white">
                    {loc.city}
                  </h3>
                </div>
                <span className="rounded-sm bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-xs transition-colors group-hover:bg-white group-hover:text-brand-ink">
                  {loc.count} {loc.count === 1 ? "Listing" : "Listings"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
