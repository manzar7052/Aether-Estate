import Link from "next/link";
import { site } from "@/config/site";

export function Logo({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 transition-opacity hover:opacity-90 ${className}`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-brand-ink text-brand-cream shadow-sm transition-transform group-hover:scale-[1.03]">
        <span className="font-serif text-sm font-semibold tracking-wider">Æ</span>
      </div>
      <div className="flex flex-col">
        <span className="font-serif text-lg font-medium tracking-tight text-brand-ink">
          {site.name}
        </span>
      </div>
    </Link>
  );
}
