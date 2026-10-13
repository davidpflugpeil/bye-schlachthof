import * as React from "react";

import { percent, type WindSector } from "@/lib/analytics";
import { formatNumber, reportNoun } from "@/lib/format";
import { DataTable, Legend, LegendItem } from "./chart-card";

const RADIUS = 100;
/** Each petal spans 36° of its 45° sector; the rest is air between petals. */
const PETAL_HALF_WIDTH = 18;

/** Compass angle (0° = north, clockwise) and radius to SVG coordinates. */
function point(degrees: number, radius: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [radius * Math.sin(radians), -radius * Math.cos(radians)];
}

function wedge(centre: number, halfWidth: number, radius: number): string {
  const [x1, y1] = point(centre - halfWidth, radius);
  const [x2, y2] = point(centre + halfWidth, radius);
  const f = (value: number) => value.toFixed(2);
  return `M0 0L${f(x1)} ${f(y1)}A${f(radius)} ${f(radius)} 0 0 1 ${f(x2)} ${f(y2)}Z`;
}

/** Ring spacing so that at most five rings cover the largest share. */
function ringStep(maximum: number): number {
  return [0.05, 0.1, 0.2, 0.25].find((step) => maximum / step <= 5) ?? 0.25;
}

/**
 * Wind rose: a petal points to where the wind came from, its length is the
 * share of reports with that wind. The outline shows the same share over all
 * hours of the period, so directions that come up more often than usual
 * stand out against the local climate rather than in isolation.
 */
export function WindRose({ sectors }: { sectors: WindSector[] }) {
  const hasBaseline = sectors.some((sector) => sector.baselineShare !== null);
  const largest = Math.max(
    0.01,
    ...sectors.map((sector) => Math.max(sector.share, sector.baselineShare ?? 0)),
  );
  const step = ringStep(largest);
  const rings = Math.ceil(largest / step - 1e-9);
  const scale = RADIUS / (rings * step);

  const outline = hasBaseline
    ? sectors.map((sector) => point(sector.degrees, (sector.baselineShare ?? 0) * scale))
    : [];

  return (
    <svg
      viewBox="-128 -128 256 256"
      className="mx-auto block w-full max-w-[20rem] overflow-visible"
      role="img"
      aria-label="Windrose der Meldungen. Die Werte stehen in der Tabelle unter dem Diagramm."
    >
      {/* Rings and axes */}
      {Array.from({ length: rings }, (_, index) => (
        <circle
          key={index}
          r={(index + 1) * step * scale}
          className="fill-none stroke-line"
          strokeWidth={1}
        />
      ))}
      <path d={`M0 ${-RADIUS}V${RADIUS}M${-RADIUS} 0H${RADIUS}`} className="stroke-line" strokeWidth={1} />

      {/* Petals, each with a hit area spanning its whole sector */}
      {sectors.map((sector) => (
        <g
          key={sector.short}
          className="group"
          data-tip={`${percent(sector.share)} der Meldungen`}
          data-tip-label={[
            `Wind aus ${sector.long}`,
            `${sector.count} ${reportNoun(sector.count)}`,
            sector.baselineShare === null ? null : `alle Stunden: ${percent(sector.baselineShare)}`,
            sector.averageSeverity === null ? null : `Ø\u00a0Stärke ${formatNumber(sector.averageSeverity, 1)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          {sector.share > 0 && (
            <path
              d={wedge(sector.degrees, PETAL_HALF_WIDTH, sector.share * scale)}
              className="fill-chart-2 transition-opacity group-hover:opacity-80"
            />
          )}
          <path d={wedge(sector.degrees, 22.5, RADIUS + 14)} fill="transparent" />
        </g>
      ))}

      {/* Baseline outline: the same shares over all hours */}
      {hasBaseline && (
        <g className="pointer-events-none">
          <path
            d={`M${outline.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}Z`}
            className="fill-none stroke-ink"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          {outline.map(([x, y], index) => (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={2.5}
              className="fill-ink stroke-surface"
              strokeWidth={1.5}
            />
          ))}
        </g>
      )}

      {/* Ring values, haloed so petals never swallow them */}
      {Array.from({ length: rings }, (_, index) => {
        const [x, y] = point(157.5, (index + 1) * step * scale);
        return (
          <text
            key={index}
            x={x + 3}
            y={y + 4}
            className="pointer-events-none fill-ink-faint stroke-surface text-[9px] tabular-nums"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {percent((index + 1) * step)}
          </text>
        );
      })}

      {/* Compass labels */}
      {sectors.map((sector) => {
        const [x, y] = point(sector.degrees, RADIUS + 16);
        return (
          <text
            key={sector.short}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            className="pointer-events-none fill-ink-soft text-[11px] font-semibold"
          >
            {sector.short}
          </text>
        );
      })}
    </svg>
  );
}

/** Legend shared by every wind chart: teal fill for reports, ink line for all hours. */
export function WindLegend({ baseline }: { baseline: boolean }) {
  return (
    <Legend>
      <LegendItem swatch={{ kind: "fill", className: "bg-chart-2" }}>Bei Meldungen</LegendItem>
      {baseline && (
        <LegendItem swatch={{ kind: "line", className: "bg-ink" }}>
          Alle Stunden im Zeitraum
        </LegendItem>
      )}
    </Legend>
  );
}

export function WindRoseTable({ sectors }: { sectors: WindSector[] }) {
  const hasBaseline = sectors.some((sector) => sector.baselineShare !== null);
  return (
    <DataTable
      columns={[
        { label: "Wind aus" },
        { label: "Meldungen", numeric: true },
        { label: "Anteil", numeric: true },
        ...(hasBaseline ? [{ label: "Alle Stunden", numeric: true }] : []),
        { label: "Ø Stärke", numeric: true },
      ]}
      rows={sectors.map((sector) => [
        sector.long,
        sector.count,
        percent(sector.share),
        ...(hasBaseline ? [percent(sector.baselineShare ?? 0)] : []),
        formatNumber(sector.averageSeverity, 1),
      ])}
    />
  );
}
