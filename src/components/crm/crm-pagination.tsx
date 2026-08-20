"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface CRMPaginationProps {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}

export function CRMPagination({
  page,
  pageSize,
  totalPages,
  totalCount,
}: CRMPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function goToPage(newPage: number) {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;

    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("page", newPage.toString());

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function changePageSize(newSize: string) {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("pageSize", newSize);
    params.set("page", "1");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalCount);

  return (
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-brand-line pt-4 text-xs text-brand-slate">
      <div>
        {totalCount > 0 ? (
          <p>
            Showing{" "}
            <span className="font-semibold text-brand-ink">{startRecord}</span>{" "}
            to{" "}
            <span className="font-semibold text-brand-ink">{endRecord}</span> of{" "}
            <span className="font-semibold text-brand-ink">{totalCount}</span>{" "}
            leads
          </p>
        ) : (
          <p>No leads found</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Page size selector */}
        <div className="flex items-center gap-1.5">
          <span>Per page:</span>
          <select
            value={pageSize}
            disabled={isPending}
            onChange={(e) => changePageSize(e.target.value)}
            className="rounded-lg border border-brand-line bg-white px-2 py-1 text-xs text-brand-ink focus:border-brand-gold focus:outline-none"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        {/* Previous / Next buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1 || isPending}
            onClick={() => goToPage(page - 1)}
            className="rounded-lg border border-brand-line bg-white px-3 py-1 font-semibold text-brand-ink shadow-sm hover:bg-brand-sand transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <span className="px-2 font-medium text-brand-ink">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages || isPending}
            onClick={() => goToPage(page + 1)}
            className="rounded-lg border border-brand-line bg-white px-3 py-1 font-semibold text-brand-ink shadow-sm hover:bg-brand-sand transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
