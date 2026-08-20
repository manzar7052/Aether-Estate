import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { LogoutButton } from "@/components/shared/logout-button";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/types/database";

export function AppShell({
  profile,
  title,
  children,
}: {
  profile: Profile;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-brand-cream text-brand-ink">
      <header className="sticky top-0 z-40 border-b border-brand-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-6">
            <Logo href={profile.role === "admin" ? "/admin" : "/dashboard"} />
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-slate transition hover:bg-brand-sand hover:text-brand-ink"
              >
                Overview
              </Link>
              <Link
                href="/dashboard/leads"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-slate transition hover:bg-brand-sand hover:text-brand-ink"
              >
                Leads CRM
              </Link>
              <Link
                href="/dashboard/appointments"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-slate transition hover:bg-brand-sand hover:text-brand-ink"
              >
                Appointments
              </Link>
              {profile.role === "admin" && (
                <Link
                  href="/admin"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-slate transition hover:bg-brand-sand hover:text-brand-ink"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-brand-ink">
                {profile.full_name}
              </p>
              <p className="text-[11px] text-brand-slate">{profile.email}</p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {profile.role}
            </Badge>
            <LogoutButton />
          </div>
        </div>
        {/* Mobile Navigation bar */}
        <div className="flex items-center gap-2 border-t border-brand-line px-4 py-2 sm:hidden">
          <Link
            href="/dashboard"
            className="rounded px-2.5 py-1 text-xs font-medium text-brand-slate hover:bg-brand-sand hover:text-brand-ink"
          >
            Overview
          </Link>
          <Link
            href="/dashboard/leads"
            className="rounded px-2.5 py-1 text-xs font-medium text-brand-slate hover:bg-brand-sand hover:text-brand-ink"
          >
            Leads CRM
          </Link>
          <Link
            href="/dashboard/appointments"
            className="rounded px-2.5 py-1 text-xs font-medium text-brand-slate hover:bg-brand-sand hover:text-brand-ink"
          >
            Appointments
          </Link>
          {profile.role === "admin" && (
            <Link
              href="/admin"
              className="rounded px-2.5 py-1 text-xs font-medium text-brand-slate hover:bg-brand-sand hover:text-brand-ink"
            >
              Admin
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
            {title}
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
