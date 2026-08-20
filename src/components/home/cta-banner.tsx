import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/site";

export function CtaBanner() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-brand-ink py-20 text-brand-cream"
    >
      <div className="relative mx-auto max-w-5xl px-6 text-center sm:px-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-brand-gold">
          Begin Your Search
        </p>
        <h2 className="mt-3 font-serif text-3xl sm:text-5xl font-normal tracking-tight text-white">
          Find a place that feels like home.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-brand-cream/75">
          Whether seeking a contemporary hillside residence, an urban glass loft, or a waterfront estate, our curated portfolio is ready for your discovery.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href={routes.properties}>
            <Button size="lg" className="bg-brand-cream text-brand-ink hover:bg-white">
              Explore Available Properties
            </Button>
          </Link>
          <Link href="/properties?status=available">
            <Button
              size="lg"
              variant="secondary"
              className="border-brand-cream/30 bg-brand-ink/40 text-brand-cream hover:bg-brand-cream/10"
            >
              View Featured Listings
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
