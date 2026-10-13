import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";

/**
 * Card for one chart: title, a German sentence saying what it shows, the
 * chart, an optional footnote and its table view. The table is the accessible
 * twin of the chart — every value a tooltip shows is in there as well.
 */
export function ChartCard({
  id,
  title,
  description,
  legend,
  footnote,
  table,
  className,
  children,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  legend?: React.ReactNode;
  footnote?: React.ReactNode;
  table?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <figure aria-labelledby={`${id}-title`} className="flex h-full flex-col">
        <h2 id={`${id}-title`} className="text-base font-bold text-ink sm:text-lg">
          {title}
        </h2>
        {description && (
          <div className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">{description}</div>
        )}
        {legend && <div className="mt-3">{legend}</div>}
        <div className="mt-5 flex-1">{children}</div>
        {footnote && (
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">{footnote}</p>
        )}
        {table && <TableView title={title}>{table}</TableView>}
      </figure>
    </Card>
  );
}

export function TableView({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group mt-4 border-t border-line pt-3">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-semibold text-ink-soft transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
        <ChevronDown
          className="size-4 transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
        Als Tabelle anzeigen
        <span className="sr-only"> – {title}</span>
      </summary>
      <div className="mt-2 max-h-80 overflow-auto rounded-md border border-line">{children}</div>
    </details>
  );
}

/** Plain table for a table view; numeric columns align right. */
export function DataTable({
  columns,
  rows,
}: {
  columns: { label: string; numeric?: boolean }[];
  rows: React.ReactNode[][];
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 bg-surface-muted">
        <tr>
          {columns.map((column) => (
            <th
              key={column.label}
              scope="col"
              className={cn(
                "border-b border-line px-3 py-2 font-semibold whitespace-nowrap text-ink",
                column.numeric ? "text-right" : "text-left",
              )}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-b border-line/70 last:border-0">
            {row.map((cell, cellIndex) => (
              <td
                key={cellIndex}
                className={cn(
                  "px-3 py-1.5 whitespace-nowrap",
                  columns[cellIndex]?.numeric
                    ? "text-right text-ink tabular-nums"
                    : "text-left text-ink-soft",
                )}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Legend({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-soft", className)}>
      {children}
    </ul>
  );
}

/** Legend entry; the swatch mirrors the mark — a block for fills, a line for outlines. */
export function LegendItem({
  swatch,
  children,
}: {
  swatch: { kind: "fill"; className: string } | { kind: "line"; className: string };
  children: React.ReactNode;
}) {
  return (
    <li className="inline-flex items-center gap-2">
      {swatch.kind === "fill" ? (
        <span className={cn("size-3 shrink-0 rounded-[3px]", swatch.className)} aria-hidden />
      ) : (
        <span className={cn("h-0.5 w-4 shrink-0 rounded-full", swatch.className)} aria-hidden />
      )}
      <span>{children}</span>
    </li>
  );
}

/** Thin horizontal meter in the style of the street ranking. */
export function MeterBar({
  share,
  className,
  trackClassName,
}: {
  /** 0–1 of the track. */
  share: number;
  className: string;
  trackClassName?: string;
}) {
  return (
    <span
      className={cn(
        "block h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken",
        trackClassName,
      )}
    >
      <span
        className={cn("block h-full rounded-full", className)}
        style={{ width: share > 0 ? `${Math.max(3, share * 100)}%` : 0 }}
      />
    </span>
  );
}
