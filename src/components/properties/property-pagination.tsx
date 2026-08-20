"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PropertyPaginationProps {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function PropertyPagination({
  total,
  page,
  limit,
  totalPages,
}: PropertyPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (totalPages <= 1) {
    return null;
  }

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;

    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete("page");
    } else {
      params.set("page", String(newPage));
    }

    startTransition(() => {
      router.push(`/properties?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-brand-line/80 pt-6 sm:flex-row">
      <p className="text-xs text-brand-ink/70">
        Showing <span className="font-semibold text-brand-ink">{startRecord}</span>–
        <span className="font-semibold text-brand-ink">{endRecord}</span> of{" "}
        <span className="font-semibold text-brand-ink">{total}</span> properties
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1 || isPending}
          onClick={() => goToPage(page - 1)}
          className="text-xs"
        >
          &larr; Previous
        </Button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            disabled={isPending}
            onClick={() => goToPage(p)}
            className={`flex h-8 w-8 items-center justify-center rounded-sm text-xs font-medium transition-colors ${
              page === p
                ? "bg-brand-ink text-brand-cream"
                : "border border-brand-line bg-brand-cream text-brand-ink hover:bg-brand-sand"
            }`}
          >
            {p}
          </button>
        ))}

        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages || isPending}
          onClick={() => goToPage(page + 1)}
          className="text-xs"
        >
          Next &rarr;
        </Button>
      </div>
    </div>
  );
}
