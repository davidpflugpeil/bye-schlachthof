import * as React from "react";

import frame from "@/lib/map-frame.json";
import {
  MAP_FIELD_METRES,
  MIN_REPORTS_PER_FIELD,
  percent,
  type MapStats,
  type Point,
} from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { formatNumber, reportNoun } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { DataTable, Legend, TableView } from "./chart-card";

/** Same teal steps as the time grid, light to dark. Index = level − 1. */
const FIELD_FILLS = ["fill-chart-1", "fill-chart-2", "fill-chart-3", "fill-chart-4"];
const SWATCHES = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4"];

/** Surface gap between neighbouring fields, in pixels of the base map. */
const FIELD_GAP = 4;

const WORLD = 256 * 2 ** frame.zoom;
const METRES_PER_DEGREE = 111_320;

/** Web Mercator position on the base map image (see scripts/fetch-map.py). */
function toImage(lat: number, lon: number): [number, number] {
  const sin = Math.sin((lat * Math.PI) / 180);
  return [
    ((lon + 180) / 360) * WORLD - frame.left,
    (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * WORLD - frame.top,
  ];
}

/** A point given in metres east and north of the reference, on the image. */
function fromMetres(reference: Point, east: number, north: number): [number, number] {
  return toImage(
    reference.lat + north / METRES_PER_DEGREE,
    reference.lon + east / (METRES_PER_DEGREE * Math.cos((reference.lat * Math.PI) / 180)),
  );
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Where do the reports come from? A static map of the quarter with the
 * reports gathered into 200 m fields, coloured by how many fall into each.
 * The base map ships with the app, so viewing it contacts no tile server.
 */
export function NeighbourhoodMap({ map, className }: { map: MapStats; className?: string }) {
  const maximum = Math.max(1, ...map.fields.map((field) => field.count));
  const half = MAP_FIELD_METRES / 2;
  const [markerX, markerY] = toImage(map.reference.lat, map.reference.lon);

  const drawn = map.fields.map((field) => {
    const centreEast = field.east * MAP_FIELD_METRES;
    const centreNorth = field.north * MAP_FIELD_METRES;
    const [left, top] = fromMetres(map.reference, centreEast - half, centreNorth + half);
    const [right, bottom] = fromMetres(map.reference, centreEast + half, centreNorth - half);
    return {
      field,
      left,
      top,
      right,
      bottom,
      visible: right > 0 && left < frame.width && bottom > 0 && top < frame.height,
      level: Math.max(1, Math.ceil((field.count / maximum) * FIELD_FILLS.length)),
    };
  });
  const outside = drawn.filter((entry) => !entry.visible).length;
  const isPublic = map.minimum > 1;

  return (
    <Card className={cn("min-w-0", className)}>
      <figure
        aria-labelledby="karte-title"
        className="grid gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-start"
      >
        <div className="lg:col-start-2 lg:row-start-1">
          <h2 id="karte-title" className="text-base font-bold text-ink sm:text-lg">
            Wo es riecht
          </h2>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">
            Meldungen, zusammengefasst in Feldern von {MAP_FIELD_METRES} × {MAP_FIELD_METRES}{" "}
            Metern – je dunkler ein Feld, desto mehr Meldungen.
          </p>

          <Legend className="mt-3">
            <li className="inline-flex items-center gap-2">
              {maximum > map.minimum ? (
                <>
                  <span className="tabular-nums">{map.minimum}</span>
                  <span className="inline-flex gap-[2px]" aria-hidden>
                    {SWATCHES.map((swatch) => (
                      <span key={swatch} className={cn("size-3 rounded-[3px]", swatch)} />
                    ))}
                  </span>
                </>
              ) : (
                <span className={cn("size-3 rounded-[3px]", SWATCHES.at(-1))} aria-hidden />
              )}
              <span>
                {maximum} {reportNoun(maximum)} pro Feld
              </span>
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="size-3 rounded-full border-2 border-surface bg-ink ring-1 ring-line" aria-hidden />
              Schlachthof
            </li>
          </Legend>

          {map.fields.length > 0 && (
            <>
              <h3 className="mt-5 text-[0.9375rem] font-bold text-ink">Am häufigsten gemeldet</h3>
              <ol className="mt-2.5 space-y-2">
                {map.fields.slice(0, 3).map((field, index) => (
                  <li
                    key={`${field.east}:${field.north}`}
                    className="flex items-baseline justify-between gap-3 text-[0.9375rem]"
                  >
                    <span className="min-w-0 text-ink">
                      <span className="mr-2 font-semibold text-ink-faint tabular-nums">
                        {index + 1}.
                      </span>
                      {capitalise(field.label)}
                    </span>
                    <span className="shrink-0 text-sm text-ink-soft tabular-nums">
                      {field.count} {reportNoun(field.count)} · Ø{" "}
                      {formatNumber(field.averageSeverity, 1)}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}

          <p className="mt-5 text-sm leading-relaxed text-ink-soft">
            {isPublic
              ? `Ein Feld erscheint erst ab ${map.minimum} Meldungen – so lässt sich keine Meldung einem einzelnen Haus zuordnen.${
                  map.suppressedShare > 0
                    ? ` ${percent(map.suppressedShare)} der Meldungen liegen in Feldern darunter.`
                    : ""
                }`
              : `Verwaltungsansicht: Alle Felder sind eingezeichnet, auch mit nur einer Meldung. Öffentlich erscheint ein Feld erst ab ${MIN_REPORTS_PER_FIELD} Meldungen.`}
            {outside > 0 &&
              ` ${outside === 1 ? "Ein Feld liegt" : `${outside} Felder liegen`} außerhalb des Kartenausschnitts und ${outside === 1 ? "steht" : "stehen"} nur in der Tabelle.`}
          </p>

          {map.fields.length > 0 && (
            <TableView title="Wo es riecht">
              <DataTable
                columns={[
                  { label: "Lage zum Schlachthof" },
                  { label: "Meldungen", numeric: true },
                  { label: "Ø Stärke", numeric: true },
                ]}
                rows={map.fields.map((field) => [
                  capitalise(field.label),
                  field.count,
                  formatNumber(field.averageSeverity, 1),
                ])}
              />
            </TableView>
          )}
        </div>

        <div
          className="relative overflow-hidden rounded-lg border border-line bg-surface-sunken lg:col-start-1 lg:row-start-1"
          style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
        >
          <img
            src="/karte/schlachthofviertel.webp"
            srcSet="/karte/schlachthofviertel-klein.webp 752w, /karte/schlachthofviertel.webp 1505w"
            sizes="(min-width: 1024px) 42rem, 100vw"
            width={frame.width}
            height={frame.height}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full"
          />

          <svg
            viewBox={`0 0 ${frame.width} ${frame.height}`}
            className="absolute inset-0 size-full"
            role="img"
            aria-label="Karte der Meldungen nach Feldern. Die Werte stehen in der Tabelle."
          >
            {drawn
              .filter((entry) => entry.visible)
              .map(({ field, left, top, right, bottom, level }) => (
                <rect
                  key={`${field.east}:${field.north}`}
                  x={left + FIELD_GAP / 2}
                  y={top + FIELD_GAP / 2}
                  width={right - left - FIELD_GAP}
                  height={bottom - top - FIELD_GAP}
                  rx={6}
                  fillOpacity={0.82}
                  className={cn(FIELD_FILLS[level - 1], "transition-opacity hover:opacity-75")}
                  data-tip={`${field.count} ${reportNoun(field.count)}`}
                  data-tip-label={`${capitalise(field.label)} · Ø Stärke ${formatNumber(field.averageSeverity, 1)}`}
                />
              ))}
          </svg>

          {/* Marker and label stay a readable size however small the map is drawn. */}
          <span
            className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center"
            style={{
              left: `${(markerX / frame.width) * 100}%`,
              top: `${(markerY / frame.height) * 100}%`,
            }}
          >
            <span className="size-3.5 rounded-full border-2 border-surface bg-ink shadow-soft" />
            <span className="absolute left-full ml-1.5 rounded bg-surface/90 px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap text-ink shadow-soft">
              Schlachthof
            </span>
          </span>

          {map.fields.length === 0 && (
            <p className="absolute inset-x-4 top-4 rounded-md bg-surface/90 px-3 py-2 text-sm text-ink-soft shadow-soft">
              Noch kein Feld mit mindestens {map.minimum} Meldungen.
            </p>
          )}

          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-0 bottom-0 rounded-tl-md bg-surface/85 px-1.5 py-0.5 text-[0.6875rem] text-ink-soft transition-colors hover:text-ink"
          >
            © OpenStreetMap-Mitwirkende
          </a>
        </div>
      </figure>
    </Card>
  );
}
