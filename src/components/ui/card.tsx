import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-brand-line bg-white p-6 shadow-[0_1px_2px_rgba(18,28,24,0.04)]",
        className,
      )}
      {...props}
    />
  );
}
