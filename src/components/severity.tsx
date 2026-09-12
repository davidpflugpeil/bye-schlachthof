import * as React from "react";

import { cn } from "@/lib/cn";
import { severityColors, severityLabel } from "@/lib/format";

/** Five bars filled up to the reported severity — readable without colour. */
export function SeverityMeter({
  severity,
  className,
  size = "md",
}: {
  severity: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const colors = severityColors(severity);
  const level = Math.min(5, Math.max(1, Math.round(severity)));
  const height = { sm: "h-1.5", md: "h-2", lg: "h-2.5" }[size];
  const width = { sm: "w-3", md: "w-4", lg: "w-5" }[size];

  return (
    <span
      className={cn("inline-flex items-center gap-[3px]", className)}
      role="img"
      aria-label={`Stärke ${level} von 5 – ${severityLabel(level)}`}
    >
      {[1, 2, 3, 4, 5].map((index) => (
        <span
          key={index}
          className={cn(
            "rounded-full transition-colors duration-300",
            height,
            width,
            index <= level ? colors.fill : "bg-line",
          )}
        />
      ))}
    </span>
  );
}

/** Compact badge: number plus German label. */
export function SeverityBadge({
  severity,
  className,
  showLabel = true,
}: {
  severity: number;
  className?: string;
  showLabel?: boolean;
}) {
  const colors = severityColors(severity);
  const level = Math.min(5, Math.max(1, Math.round(severity)));

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm font-semibold",
        colors.soft,
        colors.text,
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full text-[0.8125rem] font-bold text-white tabular-nums",
          colors.fill,
        )}
      >
        {level}
      </span>
      {showLabel && <span>{severityLabel(level)}</span>}
    </span>
  );
}
