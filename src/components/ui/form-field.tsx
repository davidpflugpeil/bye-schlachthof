"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

export interface FormFieldProps {
  /** German field label. */
  label: string;
  /** German hint below the field. */
  hint?: string;
  /** German error message; replaces the hint when present. */
  error?: string;
  optional?: boolean;
  children: (props: { id: string; "aria-describedby"?: string }) => React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  hint,
  error,
  optional,
  children,
  className,
}: FormFieldProps) {
  const id = React.useId();
  const hintId = hint || error ? `${id}-hint` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-semibold text-ink">
        {label}
        {optional && <span className="text-xs font-medium text-ink-faint">optional</span>}
      </label>
      {children({ id, "aria-describedby": hintId })}
      {error ? (
        <p id={hintId} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm leading-relaxed text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClasses = cn(
  "w-full rounded-lg border border-line-strong bg-surface px-4 py-3 text-base text-ink",
  "placeholder:text-ink-faint shadow-soft transition-colors duration-200",
  "hover:border-ink-faint/60 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/12",
);
