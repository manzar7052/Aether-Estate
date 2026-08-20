"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const sortOptions = [
  { value: "recommended", label: "Recommended" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest Listings" },
];

export function PropertySort() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSort = searchParams.get("sort_by") || "recommended";

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSort === "recommended") {
      params.delete("sort_by");
    } else {
      params.set("sort_by", newSort);
    }
    params.delete("page");

    startTransition(() => {
      router.push(`/properties?${params.toString()}`);
    });
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-brand-ink/60 font-medium whitespace-nowrap">
        Sort by:
      </span>
      <select
        value={currentSort}
        disabled={isPending}
        onChange={(e) => handleSortChange(e.target.value)}
        className="rounded-sm border border-brand-line bg-brand-cream px-3 py-1.5 text-xs text-brand-ink focus:border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-gold"
      >
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
