"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  /** German option label. */
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  /** German accessible group label. */
  label: string;
  deselectable?: boolean;
  className?: string;
  /** Wrap instead of distributing evenly — for longer lists. */
  wrap?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  deselectable = true,
  className,
  wrap = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        wrap
          ? "flex flex-wrap gap-2"
          : "grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-surface-sunken p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active && deselectable ? null : option.value)}
            className={cn(
              "min-h-11 px-3.5 text-[0.9375rem] font-semibold transition-all duration-200 ease-[var(--ease-soft)]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              wrap ? "rounded-full border py-2" : "rounded-md py-2",
              active
                ? wrap
                  ? "border-brand bg-brand text-white shadow-soft"
                  : "bg-surface text-ink shadow-soft"
                : wrap
                  ? "border-line-strong bg-surface text-ink-soft hover:border-ink-faint/60 hover:text-ink"
                  : "text-ink-soft hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
