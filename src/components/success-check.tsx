import * as React from "react";

import { cn } from "@/lib/cn";

/** Small drawn check mark used as confirmation. */
export function SuccessCheck({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-16", className)}
      role="img"
      aria-label="Erfolgreich gespeichert"
    >
      <circle cx="32" cy="32" r="30" className="fill-brand-soft" />
      <circle
        cx="32"
        cy="32"
        r="26.5"
        fill="none"
        className="stroke-brand"
        strokeWidth="2"
        strokeDasharray="166"
        style={{ animation: "draw-circle 0.6s var(--ease-out-soft) both" }}
        transform="rotate(-90 32 32)"
      />
      <path
        d="M20 33.5 L28.5 42 L44 25"
        fill="none"
        className="stroke-brand"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="32"
        style={{ animation: "draw-check 0.4s var(--ease-out-soft) 0.28s both" }}
      />
    </svg>
  );
}
