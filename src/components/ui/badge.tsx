import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "warning"
  | "neutral"
  | "success"
  | "danger";

const badgeStyles: Record<BadgeVariant, string> = {
  default: "bg-emerald-800 text-emerald-50",
  secondary: "bg-brand-sand text-brand-ink/90",
  neutral: "bg-stone-600 text-stone-100",
  warning: "bg-amber-700 text-amber-50",
  success: "bg-emerald-800 text-emerald-50",
  danger: "bg-rose-800 text-rose-50",
};

export function Badge({
  className,
  variant = "secondary",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
        badgeStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
