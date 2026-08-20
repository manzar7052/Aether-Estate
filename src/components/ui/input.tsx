import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-brand-line bg-white px-3 text-sm text-brand-ink outline-none transition placeholder:text-brand-ink/40 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20",
        className,
      )}
      {...props}
    />
  );
}
