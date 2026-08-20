import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "default"
  | "outline";

export type ButtonSize = "default" | "sm" | "lg" | "icon";

const styles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-ink text-brand-cream hover:bg-brand-ink/90 shadow-sm",
  default:
    "bg-brand-ink text-brand-cream hover:bg-brand-ink/90 shadow-sm",
  secondary:
    "bg-white text-brand-ink border border-brand-line hover:bg-brand-sand shadow-2xs",
  outline:
    "bg-transparent text-brand-ink border border-brand-line hover:bg-brand-sand",
  ghost: "text-brand-ink/80 hover:bg-brand-sand",
  danger: "bg-red-800 text-white hover:bg-red-900",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  default: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10 p-0",
};

export function Button({
  className,
  variant = "primary",
  size = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium tracking-wide transition disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold",
        styles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  );
}
