import * as React from "react";

import {
  DOWNWIND_HALF_ANGLE,
  MIN_REPORTS_FOR_PATTERNS,
  percent,
  type BaselineVerdict,
  type DownwindStats,
  type SpeedBucket,
} from "@/lib/analytics";
import { reportNoun } from "@/lib/format";
import { ChartCard, DataTable } from "./chart-card";
import { WindLegend } from "./wind-rose";

const VERDICT_TEXT: Record<BaselineVerdict, string> = {
  above:
    "Bei Meldungen kam er also deutlich häufiger von dort – ein Hinweis, dass der Geruch mit dem Wind vom Schlachthof herüberzieht.",
  below: "Bei Meldungen kam er also seltener von dort.",
  similar: "Bei Meldungen war das kaum anders – ein Zusammenhang mit der Windrichtung zeigt sich bisher nicht.",
  open: "Ob der Unterschied mehr als Zufall ist, zeigt sich erst mit weiteren Meldungen.",
};

/**
 * Did the wind blow from the slaughterhouse towards the people reporting?
 * The meter shows the share of reports where it did; the ink tick shows how
 * often that wind direction occurred at the same places over all hours —
 * the share chance alone would produce. Below: wind speed, same encoding.
 */
export function DownwindCard({
  downwind,
  speeds,
  className,
}: {
  downwind: DownwindStats;
  speeds: SpeedBucket[];
  className?: string;
}) {
  const baseline = downwind.expectedShare !== null || speeds.some((bucket) => bucket.baselineShare !== null);
  const excluded = [
    downwind.calm > 0 ? `${downwind.calm} bei Windstille` : null,
    downwind.nearSite > 0 ? `${downwind.nearSite} direkt am Gelände` : null,
    downwind.unknown > 0 ? `${downwind.unknown} ohne Wind- oder Standortdaten` : null,
  ].filter(Boolean);

  return (
    <ChartCard
      id="schlachthof-wind"
      title="Wind vom Schlachthof"
      description={`Kam der Wind aus Richtung Schlachthof (bis ${DOWNWIND_HALF_ANGLE}° Abweichung), von der Meldung aus gesehen?`}
      legend={<WindLegend baseline={baseline} />}
      className={className}
      footnote={excluded.length > 0 ? `Nicht gezählt: ${excluded.join(", ")}.` : undefined}
      table={
        <DataTable
          columns={[
            { label: "Kennzahl" },
            { label: "Meldungen", numeric: true },
            ...(baseline ? [{ label: "Alle Stunden", numeric: true }] : []),
          ]}
          rows={[
            [
              "Wind vom Schlachthof",
              downwind.share === null ? "–" : `${downwind.downwind} (${percent(downwind.share)})`,
              ...(baseline
                ? [downwind.expectedShare === null ? "–" : percent(downwind.expectedShare)]
                : []),
            ],
            ...speeds.map((bucket) => [
              `Wind ${bucket.label}`,
              `${bucket.count} (${percent(bucket.share)})`,
              ...(baseline
                ? [bucket.baselineShare === null ? "–" : percent(bucket.baselineShare)]
                : []),
            ]),
          ]}
        />
      }
    >
      {downwind.share === null ? (
        <p className="text-[0.9375rem] text-ink-soft">
          Für diesen Zeitraum fehlen Wind- oder Standortdaten.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[2.5rem] leading-none font-bold tracking-[-0.025em] text-ink">
              {percent(downwind.share)}
            </p>
            <p className="text-[0.9375rem] text-ink-soft">
              der Meldungen: Wind kam vom Schlachthof
              {downwind.eligible < MIN_REPORTS_FOR_PATTERNS && " – noch sehr wenige Meldungen"}
            </p>
          </div>

          <div
            className="relative mt-4 py-1.5"
            data-tip={`${percent(downwind.share)} der Meldungen`}
            data-tip-label={
              downwind.expectedShare === null
                ? "Wind vom Schlachthof"
                : `Wind vom Schlachthof · alle Stunden: ${percent(downwind.expectedShare)}`
            }
          >
            <div className="h-3 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-chart-2"
                style={{ width: `${Math.max(2, downwind.share * 100)}%` }}
              />
            </div>
            {downwind.expectedShare !== null && (
              <span
                className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-ink ring-2 ring-surface"
                style={{ left: `${downwind.expectedShare * 100}%` }}
                aria-hidden
              />
            )}
          </div>
          {downwind.expectedShare !== null && downwind.verdict !== null && (
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Über alle Stunden des Zeitraums kam der Wind an diesen Orten zu{" "}
              <strong className="font-semibold text-ink">{percent(downwind.expectedShare)}</strong>{" "}
              vom Schlachthof (Strich). {VERDICT_TEXT[downwind.verdict]}
            </p>
          )}
        </>
      )}

      <h3 className="mt-6 text-[0.9375rem] font-bold text-ink">Windstärke bei Meldungen</h3>
      <SpeedBars speeds={speeds} />
    </ChartCard>
  );
}

function SpeedBars({ speeds }: { speeds: SpeedBucket[] }) {
  const largest = Math.max(0.01, ...speeds.map((bucket) => Math.max(bucket.share, bucket.baselineShare ?? 0)));

  return (
    <ul className="mt-3 space-y-3">
      {speeds.map((bucket) => (
        <li
          key={bucket.label}
          className="grid grid-cols-[6.25rem_minmax(0,1fr)_2.75rem] items-center gap-3"
          data-tip={`${percent(bucket.share)} der Meldungen`}
          data-tip-label={[
            `Wind ${bucket.label}`,
            `${bucket.count} ${reportNoun(bucket.count)}`,
            bucket.baselineShare === null ? null : `alle Stunden: ${percent(bucket.baselineShare)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          <span className="text-sm whitespace-nowrap text-ink-soft">{bucket.label}</span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="block h-2.5 overflow-hidden rounded-full bg-surface-sunken">
              <span
                className="block h-full rounded-full bg-chart-2"
                style={{ width: bucket.share > 0 ? `${Math.max(3, (bucket.share / largest) * 100)}%` : 0 }}
              />
            </span>
            {bucket.baselineShare !== null && (
              <span
                className="block h-0.5 rounded-full bg-ink"
                style={{ width: `${Math.max(1, (bucket.baselineShare / largest) * 100)}%` }}
                aria-hidden
              />
            )}
          </span>
          <span className="text-right text-sm font-semibold text-ink tabular-nums">
            {percent(bucket.share)}
          </span>
        </li>
      ))}
    </ul>
  );
}
