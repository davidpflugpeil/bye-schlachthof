import * as React from "react";

import { cn } from "@/lib/cn";

type Tone = "plain" | "muted" | "sunken" | "brand" | "sand";

const TONES: Record<Tone, string> = {
  plain: "bg-surface border border-line",
  muted: "bg-surface-muted border border-line",
  sunken: "bg-surface-sunken border border-line/70",
  brand: "bg-brand-tint border border-brand-soft",
  sand: "bg-sand-soft border border-sand",
};

const SHADOWS = {
  none: "",
  soft: "shadow-soft",
  card: "shadow-card",
  lifted: "shadow-lifted",
} as const;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  padded?: boolean;
  shadow?: keyof typeof SHADOWS;
}

export function Card({
  tone = "plain",
  padded = true,
  shadow = "soft",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn("rounded-xl", TONES[tone], SHADOWS[shadow], padded && "p-5 sm:p-6", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-lg font-bold text-ink sm:text-xl", className)} {...rest}>
      {children}
    </h2>
  );
}

export function CardDescription({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft", className)} {...rest}>
      {children}
    </p>
  );
}
