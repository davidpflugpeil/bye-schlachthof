import * as React from "react";

import { WEEKDAYS, type HourBucket } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { formatNumber, reportNoun } from "@/lib/format";
import { DataTable, Legend } from "./chart-card";

/** Light to dark — more reports per cell, darker teal. Index = level − 1. */
const HEAT_LEVELS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4"];

function heatLevel(count: number, maximum: number): number {
  return count === 0 ? 0 : Math.max(1, Math.ceil((count / maximum) * HEAT_LEVELS.length));
}

function hourRange(hour: number): string {
  return `${hour}–${hour + 1} Uhr`;
}

function countLabel(count: number): string {
  return `${count} ${reportNoun(count)}`;
}

/**
 * When do reports come in? Hour-of-day columns sit on top of a weekday ×
 * hour grid and share its x-axis, so a peak in the columns can be traced down
 * to the days it comes from. Weekday totals run down the right edge.
 */
export function TimeOfDayChart({
  hours,
  grid,
  weekdays,
}: {
  hours: HourBucket[];
  grid: number[][];
  weekdays: number[];
}) {
  const busiestHour = Math.max(1, ...hours.map((entry) => entry.count));
  const busiestCell = Math.max(1, ...grid.flat());
  const peak = hours.reduce((best, entry) => (entry.count > best.count ? entry : best), hours[0]);

  return (
    <div
      role="img"
      aria-label="Meldungen nach Uhrzeit und Wochentag. Die Werte stehen in der Tabelle unter dem Diagramm."
    >
      <div className="grid grid-cols-[1.75rem_repeat(24,minmax(0,1fr))_1.75rem] gap-[2px] pt-5 sm:grid-cols-[2rem_repeat(24,minmax(0,1fr))_2.25rem]">
        {/* Hour-of-day columns */}
        <span aria-hidden />
        {hours.map((entry) => (
          <div
            key={entry.hour}
            className="group relative flex h-16 items-end justify-center sm:h-20"
            data-tip={countLabel(entry.count)}
            data-tip-label={
              entry.averageSeverity === null
                ? hourRange(entry.hour)
                : `${hourRange(entry.hour)} · Ø\u00a0Stärke ${formatNumber(entry.averageSeverity, 1)}`
            }
          >
            <span
              className="block w-full max-w-6 rounded-t-[4px] bg-chart-4 transition-opacity group-hover:opacity-80"
              style={{ height: `${(entry.count / busiestHour) * 100}%` }}
            />
            {entry.hour === peak.hour && entry.count > 0 && (
              <span className="absolute -top-5 text-xs font-semibold text-ink tabular-nums">
                {entry.count}
              </span>
            )}
          </div>
        ))}
        <span className="self-end text-right text-[0.6875rem] text-ink-faint">ges.</span>

        {/* Baseline of the columns */}
        <span aria-hidden />
        <span className="col-span-24 h-px bg-line-strong" aria-hidden />
        <span aria-hidden />

        {/* Weekday × hour grid */}
        {WEEKDAYS.map((weekday, dayIndex) => (
          <React.Fragment key={weekday.short}>
            <span className="self-center text-xs font-medium text-ink-soft">{weekday.short}</span>
            {grid[dayIndex].map((count, hour) => {
              const level = heatLevel(count, busiestCell);
              return (
                <span
                  key={hour}
                  className={cn(
                    "h-5 rounded-[3px] transition-opacity hover:opacity-80 sm:h-6",
                    level === 0 ? "bg-surface-sunken" : HEAT_LEVELS[level - 1],
                  )}
                  data-tip={countLabel(count)}
                  data-tip-label={`${weekday.long}, ${hourRange(hour)}`}
                />
              );
            })}
            <span className="self-center text-right text-xs text-ink-soft tabular-nums">
              {weekdays[dayIndex]}
            </span>
          </React.Fragment>
        ))}

        {/* Hour axis: every six hours on phones, every three from small screens up */}
        <span aria-hidden />
        {hours.map((entry) => (
          <span
            key={entry.hour}
            className={cn(
              "pt-1 text-center text-[0.6875rem] text-ink-faint tabular-nums",
              // Hidden labels keep their cell, or the axis would shift.
              entry.hour % 6 !== 0 && "invisible sm:visible",
            )}
            aria-hidden
          >
            {entry.hour % 3 === 0 ? entry.hour : ""}
          </span>
        ))}
        <span aria-hidden />
      </div>
    </div>
  );
}

/** Scale legend for the grid: empty, then the four steps up to the busiest cell. */
export function HeatLegend({ maximum }: { maximum: number }) {
  return (
    <Legend>
      <li className="inline-flex items-center gap-2">
        <span className="size-3 rounded-[3px] bg-surface-sunken ring-1 ring-line ring-inset" aria-hidden />
        <span>keine</span>
      </li>
      {maximum <= 1 ? (
        // Every filled cell holds one report and takes the darkest step.
        <li className="inline-flex items-center gap-2">
          <span className={cn("size-3 rounded-[3px]", HEAT_LEVELS.at(-1))} aria-hidden />
          <span>1 Meldung</span>
        </li>
      ) : (
        <li className="inline-flex items-center gap-2">
          <span>1</span>
          <span className="inline-flex gap-[2px]" aria-hidden>
            {HEAT_LEVELS.map((level) => (
              <span key={level} className={cn("size-3 rounded-[3px]", level)} />
            ))}
          </span>
          <span>
            {maximum} {reportNoun(maximum)} pro Feld
          </span>
        </li>
      )}
    </Legend>
  );
}

export function TimeOfDayTable({
  hours,
  grid,
}: {
  hours: HourBucket[];
  grid: number[][];
}) {
  return (
    <DataTable
      columns={[
        { label: "Uhrzeit" },
        ...WEEKDAYS.map((weekday) => ({ label: weekday.short, numeric: true })),
        { label: "Gesamt", numeric: true },
        { label: "Ø Stärke", numeric: true },
      ]}
      rows={hours.map((entry) => [
        hourRange(entry.hour),
        ...WEEKDAYS.map((_, dayIndex) => grid[dayIndex][entry.hour]),
        entry.count,
        formatNumber(entry.averageSeverity, 1),
      ])}
    />
  );
}
