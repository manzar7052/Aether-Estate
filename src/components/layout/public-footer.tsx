"use client";

import Link from "next/link";
import { Logo } from "./logo";
import { site, routes } from "@/config/site";
import { useChat } from "@/components/chat/chat-context";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const { openChat } = useChat();

  return (
    <footer className="border-t border-brand-line/80 bg-brand-sand/50 text-brand-ink">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 lg:gap-12">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Logo />
            <p className="max-w-md font-serif text-lg italic text-brand-ink/80">
              &ldquo;{site.tagline}&rdquo;
            </p>
            <p className="max-w-md text-sm leading-relaxed text-brand-ink/70">
              {site.description}
            </p>
            <div className="pt-2 text-xs leading-relaxed text-brand-ink/50">
              <span className="font-semibold uppercase tracking-wider text-brand-gold">
                Demo Notice:
              </span>{" "}
              {site.disclaimer}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold tracking-widest uppercase text-brand-ink/60">
              Discover
            </h3>
            <ul className="space-y-2 text-sm text-brand-ink/70">
              <li>
                <Link
                  href={routes.properties}
                  className="transition-colors hover:text-brand-ink"
                >
                  All Properties
                </Link>
              </li>
              <li>
                <Link
                  href="/properties?property_type=house"
                  className="transition-colors hover:text-brand-ink"
                >
                  Luxury Homes
                </Link>
              </li>
              <li>
                <Link
                  href="/properties?property_type=condo"
                  className="transition-colors hover:text-brand-ink"
                >
                  Condos & Penthouses
                </Link>
              </li>
              <li>
                <Link
                  href="/properties?property_type=apartment"
                  className="transition-colors hover:text-brand-ink"
                >
                  Urban Lofts
                </Link>
              </li>
              <li>
                <Link
                  href="/#locations"
                  className="transition-colors hover:text-brand-ink"
                >
                  Featured Markets
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Staff */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold tracking-widest uppercase text-brand-ink/60">
              Company & Staff
            </h3>
            <ul className="space-y-2 text-sm text-brand-ink/70">
              <li>
                <Link
                  href="/#why-us"
                  className="transition-colors hover:text-brand-ink"
                >
                  Why Aether
                </Link>
              </li>
              <li>
                <Link
                  href="/#how-it-works"
                  className="transition-colors hover:text-brand-ink"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openChat()}
                  className="text-left text-sm text-brand-ink/70 transition-colors hover:text-brand-ink cursor-pointer"
                >
                  Contact Concierge
                </button>
              </li>
              <li>
                <Link
                  href={routes.login}
                  className="inline-flex items-center gap-1 font-medium text-brand-gold transition-colors hover:text-brand-ink"
                >
                  Staff Portal Sign In &rarr;
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-brand-line/60 pt-8 text-xs text-brand-ink/60 sm:flex-row">
          <p>© {currentYear} Aether Estates. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Portfolio Demo Edition</span>
            <span>Next.js + Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
