import * as React from "react";

import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  /** German headline. */
  title: string;
  /** German supporting sentence. */
  text?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, text, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface-muted text-center",
        compact ? "px-5 py-8" : "px-6 py-12 sm:py-14",
        className,
      )}
    >
      {icon && (
        <div className="mb-3.5 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-ink">{title}</p>
      {text && (
        <p className="mt-1.5 max-w-sm text-[0.9375rem] leading-relaxed text-ink-soft">{text}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
