import * as React from "react";

import { cn } from "@/lib/cn";

export interface StatCardProps {
  /** German label above the value. */
  label: string;
  value: React.ReactNode;
  /** German supporting line below the value. */
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, hint, icon, className }: StatCardProps) {
  return (
    <div className={cn("rounded-lg border border-line bg-surface p-4 shadow-soft sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-soft">{label}</p>
        {icon && <span className="text-ink-faint">{icon}</span>}
      </div>
      <p className="mt-2 text-[1.75rem] leading-none font-bold tracking-[-0.02em] text-ink tabular-nums sm:text-3xl">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}
