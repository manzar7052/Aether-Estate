"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { navLinks, routes } from "@/config/site";
import { useChat } from "@/components/chat/chat-context";

export function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { openChat } = useChat();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Escape key handler for accessible drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        isScrolled
          ? "border-b border-brand-line/70 bg-brand-cream/95 backdrop-blur-md shadow-xs"
          : "bg-brand-cream/80 backdrop-blur-xs"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8">
        <Logo />

        {/* Desktop Navigation */}
        <nav
          aria-label="Main Navigation"
          className="hidden items-center gap-8 md:flex"
        >
          {navLinks.map((link) => {
            const isContact = link.label === "Contact";
            const isActive =
              pathname === link.href ||
              ((link.href as string) !== "/" && pathname.startsWith(link.href));

            if (isContact) {
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => openChat()}
                  className="text-sm font-medium transition-colors hover:text-brand-ink text-brand-ink/70 cursor-pointer"
                >
                  {link.label}
                </button>
              );
            }

            return (
              <Link
                key={link.label}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-brand-ink ${
                  isActive ? "text-brand-ink font-semibold" : "text-brand-ink/70"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href={routes.login}
            className="text-xs font-medium tracking-wider uppercase text-brand-ink/60 transition-colors hover:text-brand-ink"
          >
            Staff Portal
          </Link>
          <Link href={routes.properties}>
            <Button size="sm">Find a Property</Button>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsOpen(!isOpen)}
          className="relative z-50 flex h-10 w-10 items-center justify-center rounded-sm text-brand-ink transition-colors hover:bg-brand-sand/60 focus:outline-none focus:ring-2 focus:ring-brand-gold md:hidden"
        >
          <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
          <div className="flex h-4 w-5 flex-col justify-between">
            <span
              className={`h-0.5 w-full bg-current transition-transform duration-200 ${
                isOpen ? "translate-y-1.5 rotate-45" : ""
              }`}
            />
            <span
              className={`h-0.5 w-full bg-current transition-opacity duration-200 ${
                isOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`h-0.5 w-full bg-current transition-transform duration-200 ${
                isOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          className="fixed inset-0 top-[65px] z-40 flex flex-col bg-brand-cream px-6 py-8 md:hidden"
        >
          <nav className="flex flex-col gap-6">
            {navLinks.map((link) => {
              const isContact = link.label === "Contact";

              if (isContact) {
                return (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      openChat();
                    }}
                    className="font-serif text-2xl font-normal text-brand-ink text-left transition-colors hover:text-brand-gold cursor-pointer"
                  >
                    {link.label}
                  </button>
                );
              }

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="font-serif text-2xl font-normal text-brand-ink transition-colors hover:text-brand-gold"
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-3 pt-6 border-t border-brand-line">
            <Link href={routes.properties} onClick={() => setIsOpen(false)}>
              <Button className="w-full justify-center">Find a Property</Button>
            </Link>
            <Link href={routes.login} onClick={() => setIsOpen(false)}>
              <Button variant="secondary" className="w-full justify-center">
                Staff Portal Sign In
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
