import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/site";

export default function PropertyNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:px-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-sand text-brand-gold mb-6">
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </div>
      <p className="text-xs font-semibold tracking-widest uppercase text-brand-gold">
        404 &bull; Listing Unavailable
      </p>
      <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-normal text-brand-ink">
        Property Not Found
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-brand-ink/70">
        The property listing you are looking for does not exist or may have been removed from our active catalog.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href={routes.properties}>
          <Button size="lg">Back to All Properties</Button>
        </Link>
        <Link href={routes.home}>
          <Button variant="secondary" size="lg">
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
