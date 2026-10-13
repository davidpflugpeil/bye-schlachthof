import * as React from "react";

import type { TimelineBucket } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { formatNumber, reportNoun } from "@/lib/format";
import { DataTable, Legend, LegendItem } from "./chart-card";

/** Tick spacing so that at most five gridlines cover the tallest column. */
function tickStep(maximum: number): number {
  return (
    [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500].find((step) => maximum / step <= 5) ??
    Math.ceil(maximum / 5)
  );
}

/**
 * Reports per day (or week, for long periods), split into strong reports at
 * the baseline and milder ones on top. Quiet days stay in the axis as gaps —
 * how often nothing was reported is part of the picture.
 */
export function TimelineChart({ buckets }: { buckets: TimelineBucket[] }) {
  const largest = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const step = tickStep(largest);
  const top = Math.ceil(largest / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, index) => index * step);
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 6));

  return (
    <div
      role="img"
      aria-label="Meldungen im Zeitverlauf. Die Werte stehen in der Tabelle unter dem Diagramm."
    >
      <div className="flex gap-2">
        {/* Value axis */}
        <div className="relative h-44 w-6 shrink-0 sm:h-52" aria-hidden>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2 text-[0.6875rem] text-ink-faint tabular-nums"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div className="relative h-44 min-w-0 flex-1 sm:h-52">
          {ticks.map((tick) => (
            <span
              key={tick}
              className={cn("absolute inset-x-0 h-px", tick === 0 ? "bg-line-strong" : "bg-line")}
              style={{ bottom: `${(tick / top) * 100}%` }}
              aria-hidden
            />
          ))}

          <div className="absolute inset-0 flex items-end">
            {buckets.map((bucket) => {
              const mild = bucket.count - bucket.strong;
              return (
                <div
                  key={bucket.key}
                  className="group flex h-full min-w-0 flex-1 items-end justify-center px-px"
                  data-tip={`${bucket.count} ${reportNoun(bucket.count)}`}
                  data-tip-label={
                    bucket.count === 0
                      ? bucket.longLabel
                      : `${bucket.longLabel} · davon ${bucket.strong} stark/extrem · Ø\u00a0Stärke ${formatNumber(bucket.averageSeverity, 1)}`
                  }
                >
                  {bucket.count > 0 && (
                    <span
                      className="flex w-full max-w-6 flex-col gap-[2px] transition-opacity group-hover:opacity-80"
                      style={{ height: `${(bucket.count / top) * 100}%` }}
                    >
                      {mild > 0 && (
                        <span
                          className="block min-h-px rounded-t-[4px] bg-chart-2"
                          style={{ flex: `${mild} 1 0` }}
                        />
                      )}
                      {bucket.strong > 0 && (
                        <span
                          className={cn("block min-h-px bg-sev-4", mild === 0 && "rounded-t-[4px]")}
                          style={{ flex: `${bucket.strong} 1 0` }}
                        />
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Time axis */}
      <div className="mt-1.5 ml-8 flex" aria-hidden>
        {buckets.map((bucket, index) => (
          <span key={bucket.key} className="relative h-4 min-w-0 flex-1">
            {index % labelEvery === 0 && (
              <span className="absolute left-1/2 -translate-x-1/2 text-[0.6875rem] whitespace-nowrap text-ink-faint tabular-nums">
                {bucket.label}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TimelineLegend() {
  return (
    <Legend>
      <LegendItem swatch={{ kind: "fill", className: "bg-sev-4" }}>Stark oder extrem (4–5)</LegendItem>
      <LegendItem swatch={{ kind: "fill", className: "bg-chart-2" }}>Kaum bis deutlich (1–3)</LegendItem>
    </Legend>
  );
}

export function TimelineTable({ buckets }: { buckets: TimelineBucket[] }) {
  return (
    <DataTable
      columns={[
        { label: "Zeitraum" },
        { label: "Meldungen", numeric: true },
        { label: "Stark/extrem", numeric: true },
        { label: "Ø Stärke", numeric: true },
      ]}
      rows={buckets.map((bucket) => [
        bucket.longLabel,
        bucket.count,
        bucket.strong,
        formatNumber(bucket.averageSeverity, 1),
      ])}
    />
  );
}
