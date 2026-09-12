import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "subtle" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-card hover:bg-brand-hover active:bg-brand-deep " +
    "disabled:bg-brand/45 disabled:shadow-none",
  secondary:
    "bg-surface text-ink border border-line-strong shadow-soft hover:bg-surface-muted " +
    "active:bg-surface-sunken disabled:text-ink-faint",
  subtle:
    "bg-brand-soft text-brand-deep hover:bg-brand-soft/70 active:bg-brand-soft " +
    "disabled:text-brand/50",
  ghost: "text-ink-soft hover:bg-canvas-deep hover:text-ink active:bg-line",
  danger: "bg-danger text-white shadow-card hover:brightness-95 active:brightness-90",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-md",
  md: "h-11 px-5 text-[0.9375rem] gap-2 rounded-lg",
  lg: "h-13 px-6 text-base gap-2.5 rounded-lg",
  xl: "h-14 px-7 text-[1.0625rem] gap-2.5 rounded-xl",
};

const BASE =
  "inline-flex items-center justify-center font-semibold tracking-[-0.005em] " +
  "transition-[background-color,color,box-shadow,transform] duration-200 ease-[var(--ease-soft)] " +
  "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-70 disabled:active:scale-100 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function buttonClasses(options?: {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
}) {
  const { variant = "primary", size = "md", fullWidth = false, className } = options ?? {};
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  /** German text shown while the action is running. */
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    loadingText,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading && <Loader2 className="size-[1.15em] shrink-0 animate-spin" aria-hidden />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
});

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** German accessible label. */
  label: string;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const ICON_SIZES = {
  sm: "size-9 rounded-md",
  md: "size-11 rounded-lg",
  lg: "size-12 rounded-lg",
} as const;

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = "secondary", size = "md", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        "transition-colors duration-200 ease-[var(--ease-soft)] active:scale-[0.97]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        VARIANTS[variant],
        ICON_SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export interface ButtonLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

/** Visually identical to `Button`, semantically a link. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      {children}
    </Link>
  );
}
