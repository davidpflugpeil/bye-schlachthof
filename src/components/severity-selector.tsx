"use client";

import * as React from "react";

import { cn } from "@/lib/cn";
import { SEVERITY_LEVELS, severityColors } from "@/lib/format";
import type { Severity } from "@/lib/types";

export interface SeveritySelectorProps {
  value: Severity | null;
  onChange: (value: Severity) => void;
  /** German accessible group label. */
  label?: string;
  className?: string;
}

/**
 * Five large targets, side by side from 380 px up. The selection is never
 * conveyed by colour alone — number and label carry it too.
 */
export function SeveritySelector({
  value,
  onChange,
  label = "Wie stark riecht es gerade?",
  className,
}: SeveritySelectorProps) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const directions: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    const step = directions[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + SEVERITY_LEVELS.length) % SEVERITY_LEVELS.length;
    refs.current[next]?.focus();
    onChange(SEVERITY_LEVELS[next].value);
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid grid-cols-5 gap-1.5 min-[380px]:gap-2 sm:gap-2.5", className)}
    >
      {SEVERITY_LEVELS.map((level, index) => {
        const active = value === level.value;
        const colors = severityColors(level.value);

        return (
          <button
            key={level.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active || (value === null && index === 0) ? 0 : -1}
            onClick={() => onChange(level.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            title={level.description}
            className={cn(
              "group relative flex min-h-[5.25rem] flex-col items-center justify-center gap-1 rounded-lg border-2 px-1 py-3",
              "transition-all duration-200 ease-[var(--ease-soft)] sm:min-h-[6.5rem] sm:gap-1.5",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              active
                ? cn(colors.fill, "border-transparent text-white shadow-card")
                : "border-line bg-surface text-ink-soft shadow-soft hover:border-line-strong hover:bg-surface-muted active:scale-[0.98]",
            )}
          >
            <span
              className={cn(
                "text-2xl leading-none font-bold tabular-nums transition-colors sm:text-[1.75rem]",
                active ? "text-white" : "text-ink",
              )}
            >
              {level.value}
            </span>
            <span
              className={cn(
                "text-center text-[0.6875rem] leading-tight font-semibold min-[380px]:text-xs sm:text-[0.8125rem]",
                active ? "text-white/95" : "text-ink-soft",
              )}
            >
              {level.label}
            </span>
            {active && (
              <span
                aria-hidden
                className="absolute inset-0 rounded-[calc(var(--radius-lg)-2px)] ring-4 ring-ink/5"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
