import { formatNumber, reportNoun } from "./format";
import type {
  AnalyticsRow,
  Severity,
  StreetStat,
  WindHour,
} from "./types";

/*
 * Turns the visible reports of a period into the numbers behind the analytics
 * page. Pure functions only — the database and the weather archive are read
 * in `analytics-data.ts`, so everything here can be reasoned about (and
 * tested) without either.
 */

/* ------------------------------------------------------------------ */
/* Periods                                                             */
/* ------------------------------------------------------------------ */

export type RangeKey = "7" | "30" | "90" | "all";

export interface RangeOption {
  key: RangeKey;
  /** German label for the filter. */
  label: string;
  /** Length in calendar days; null means "since the first report". */
  days: number | null;
}

export const RANGES: RangeOption[] = [
  { key: "7", label: "7 Tage", days: 7 },
  { key: "30", label: "30 Tage", days: 30 },
  { key: "90", label: "90 Tage", days: 90 },
  { key: "all", label: "Gesamt", days: null },
];

/** The project is young — the whole history shows the pattern best for now. */
const DEFAULT_RANGE: RangeKey = "all";

export function parseRange(value: string | string[] | undefined): RangeOption {
  const key = Array.isArray(value) ? value[0] : value;
  return (
    RANGES.find((range) => range.key === key) ??
    RANGES.find((range) => range.key === DEFAULT_RANGE)!
  );
}

/** Calendar arithmetic on YYYY-MM-DD strings, independent of the server's time zone. */
function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** ISO weekday of a calendar day: 1 = Monday … 7 = Sunday. */
function weekdayOf(day: string): number {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function weekStart(day: string): string {
  return addDays(day, 1 - weekdayOf(day));
}

function isoWeek(day: string): number {
  // The ISO week belongs to the year of its Thursday.
  const thursday = addDays(day, 4 - weekdayOf(day));
  const yearStart = `${thursday.slice(0, 4)}-01-01`;
  return Math.floor(daysBetween(yearStart, thursday) / 7) + 1;
}

const shortDate = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

const fullDate = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const longDate = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** "12.10." — calendar days are formatted at noon UTC so no zone can shift them. */
function formatShortDay(day: string): string {
  return shortDate.format(new Date(`${day}T12:00:00Z`));
}

/** "12.10.2026" */
export function formatFullDay(day: string): string {
  return fullDate.format(new Date(`${day}T12:00:00Z`));
}

function formatLongDay(day: string): string {
  return longDate.format(new Date(`${day}T12:00:00Z`));
}

export interface Period {
  range: RangeOption;
  /** First Munich day of the period, YYYY-MM-DD. */
  startDay: string;
  /** Last Munich day of the period — today. */
  endDay: string;
  dayCount: number;
  /** Long periods are charted per week, short ones per day. */
  granularity: "day" | "week";
}

export function periodFor(range: RangeOption, today: string, firstDay: string | null): Period {
  const startDay = range.days
    ? addDays(today, -(range.days - 1))
    : firstDay && firstDay < today
      ? firstDay
      : today;
  const dayCount = daysBetween(startDay, today) + 1;

  return {
    range,
    startDay,
    endDay: today,
    dayCount,
    granularity: dayCount > 45 ? "week" : "day",
  };
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

export interface Point {
  lat: number;
  lon: number;
}

const METRES_PER_DEGREE = 111_320;

/** Flat-earth offsets — accurate to well under a metre across one quarter. */
function offset(from: Point, to: Point): { east: number; north: number } {
  return {
    east: (to.lon - from.lon) * METRES_PER_DEGREE * Math.cos((from.lat * Math.PI) / 180),
    north: (to.lat - from.lat) * METRES_PER_DEGREE,
  };
}

/** Compass bearing from one point to another, 0° = north, clockwise. */
function bearing(from: Point, to: Point): number {
  const { east, north } = offset(from, to);
  return ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
}

function distance(from: Point, to: Point): number {
  const { east, north } = offset(from, to);
  return Math.hypot(east, north);
}

/** Smallest angle between two compass directions, 0–180°. */
function angleBetween(a: number, b: number): number {
  const difference = Math.abs((((a - b) % 360) + 360) % 360);
  return difference > 180 ? 360 - difference : difference;
}

/* ------------------------------------------------------------------ */
/* Thresholds                                                          */
/* ------------------------------------------------------------------ */

/** Below this many reports a share says more about chance than about a pattern. */
export const MIN_REPORTS_FOR_PATTERNS = 5;

/** Beaufort 0: below 1 km/h the wind has no meaningful direction. */
export const CALM_BELOW_KMH = 1;

/**
 * Reports this close to the reference point sit on the site itself, where any
 * wind direction carries the smell — they are left out of the direction test.
 */
export const NEAR_SITE_METRES = 100;

/** Edge length of a map field — whole blocks, never a single building. */
export const MAP_FIELD_METRES = 200;

/**
 * On the public map a field only appears from this many reports on, so no
 * field can stand for a single household. Maintainers see every field.
 */
export const MIN_REPORTS_PER_FIELD = 3;

/**
 * Half-width of the cone that counts as "wind from the slaughterhouse": the
 * wind may come from up to 45° either side of the straight line between
 * report and slaughterhouse. Plumes widen as they travel, and the modelled
 * wind is itself an approximation.
 */
export const DOWNWIND_HALF_ANGLE = 45;

/* ------------------------------------------------------------------ */
/* Result types                                                        */
/* ------------------------------------------------------------------ */

export interface HourBucket {
  hour: number;
  count: number;
  averageSeverity: number | null;
}

export interface TimelineBucket {
  key: string;
  /** Short German axis label, e.g. "12.10." or "KW 41". */
  label: string;
  /** Longer German label for the tooltip and the table. */
  longLabel: string;
  count: number;
  /** Reports at severity 4 or 5. */
  strong: number;
  averageSeverity: number | null;
}

export interface WindSector {
  /** Abbreviation, e.g. "SW". */
  short: string;
  /** German name, e.g. "Südwest". */
  long: string;
  /** Centre of the sector in compass degrees. */
  degrees: number;
  count: number;
  /** Share of reports with a wind direction. */
  share: number;
  averageSeverity: number | null;
  /** Share of all hours in the period with wind from here; null without baseline. */
  baselineShare: number | null;
}

export interface SpeedBucket {
  label: string;
  count: number;
  share: number;
  baselineShare: number | null;
}

/**
 * How a share among reports compares with the share chance would produce:
 * clearly above or below, close to it, or not yet decidable with this few
 * reports. "Clearly" means `threshold` standard errors — two for a single
 * comparison, more when the value is the largest of several candidates (the
 * busiest of 24 hours wins by chance alone more often than any one hour).
 */
export type BaselineVerdict = "above" | "below" | "similar" | "open";

function compareWithBaseline(
  hits: number,
  total: number,
  expected: number,
  threshold = 2,
): BaselineVerdict {
  const spread = Math.sqrt(total * expected * (1 - expected));
  const score = spread > 0 ? (hits - total * expected) / spread : 0;
  if (score >= threshold) return "above";
  if (score <= -threshold) return "below";
  return Math.abs(hits / total - expected) < 0.05 ? "similar" : "open";
}

export interface DownwindStats {
  /** Reports that could be tested: location and wind known, not calm, not on site. */
  eligible: number;
  /** Of those, reports where the wind came from the slaughterhouse. */
  downwind: number;
  share: number | null;
  /**
   * How often the wind blew from the slaughterhouse towards the same places
   * across all hours of the period — what chance alone would produce.
   */
  expectedShare: number | null;
  verdict: BaselineVerdict | null;
  calm: number;
  nearSite: number;
  /** Reports without wind data or without a location. */
  unknown: number;
}

export interface MapField {
  /** Field centre in steps of MAP_FIELD_METRES east and north of the reference point. */
  east: number;
  north: number;
  count: number;
  averageSeverity: number;
  /** German position relative to the slaughterhouse, e.g. "600 m nordöstlich". */
  label: string;
}

export interface MapStats {
  reference: Point;
  /** Fields with at least `minimum` reports, busiest first. */
  fields: MapField[];
  minimum: number;
  /** Share of located reports that sit in fields below the minimum. */
  suppressedShare: number;
}

/** A German sentence; strong parts are rendered bold. */
export type TakeawayPart = string | { strong: string };

export interface Takeaway {
  kind: "time" | "wind" | "strength" | "sector" | "weekday" | "street" | "sparse";
  parts: TakeawayPart[];
}

export interface AdminInsights {
  hidden: number;
  channels: { shortcut: number; web: number };
  /** Distinct reporter check values — a rough count of senders, see the page note. */
  senders: number;
  /** Share of the period's reports that came from the single most active sender. */
  topSenderShare: number | null;
  completeness: { label: string; count: number }[];
}

export interface Analytics {
  period: Period;
  total: number;
  averageSeverity: number | null;
  strong: number;
  streets: StreetStat[];
  hours: HourBucket[];
  /** Counts per [weekday 0 = Monday][hour]. */
  grid: number[][];
  weekdays: number[];
  timeline: TimelineBucket[];
  severities: { level: Severity; count: number }[];
  wind: {
    sectors: WindSector[];
    /** Reports with a usable wind direction (not calm). */
    withDirection: number;
    calm: number;
    /** Hours in the comparison baseline; null when the archive was unreachable. */
    baselineHours: number | null;
    downwind: DownwindStats;
    speeds: SpeedBucket[];
  };
  map: MapStats;
  takeaways: Takeaway[];
  admin: AdminInsights | null;
}

export interface AnalyticsInput {
  rows: AnalyticsRow[];
  period: Period;
  windHistory: WindHour[] | null;
  /** Where the smell is assumed to come from. */
  reference: Point;
  /** Present only for signed-in maintainers. */
  admin: { hidden: number } | null;
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export const WEEKDAYS = [
  { short: "Mo", long: "Montag", adverb: "montags" },
  { short: "Di", long: "Dienstag", adverb: "dienstags" },
  { short: "Mi", long: "Mittwoch", adverb: "mittwochs" },
  { short: "Do", long: "Donnerstag", adverb: "donnerstags" },
  { short: "Fr", long: "Freitag", adverb: "freitags" },
  { short: "Sa", long: "Samstag", adverb: "samstags" },
  { short: "So", long: "Sonntag", adverb: "sonntags" },
];

const SECTORS = [
  { short: "N", long: "Nord" },
  { short: "NO", long: "Nordost" },
  { short: "O", long: "Ost" },
  { short: "SO", long: "Südost" },
  { short: "S", long: "Süd" },
  { short: "SW", long: "Südwest" },
  { short: "W", long: "West" },
  { short: "NW", long: "Nordwest" },
];

const SPEED_BUCKETS = [
  { label: "unter 5 km/h", below: 5 },
  { label: "5–10 km/h", below: 10 },
  { label: "10–20 km/h", below: 20 },
  { label: "über 20 km/h", below: Infinity },
];

function sectorIndex(degrees: number): number {
  return Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
}

function speedIndex(speedKmh: number): number {
  return SPEED_BUCKETS.findIndex((bucket) => speedKmh < bucket.below);
}

/** "64 %" with a non-breaking space, as German typesetting wants it. */
export function percent(share: number): string {
  return `${Math.round(share * 100)} %`;
}

/* ------------------------------------------------------------------ */
/* Aggregation                                                         */
/* ------------------------------------------------------------------ */

function average(sum: number, count: number): number | null {
  return count > 0 ? sum / count : null;
}

function isStrong(severity: number): boolean {
  return severity >= 4;
}

export function computeAnalytics(input: AnalyticsInput): Analytics {
  const { rows, period } = input;
  const total = rows.length;

  /* Time of day and weekday --------------------------------------- */
  const hourSums = Array.from({ length: 24 }, () => ({ count: 0, severity: 0 }));
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const weekdays = Array<number>(7).fill(0);
  const severities = [1, 2, 3, 4, 5].map((level) => ({ level: level as Severity, count: 0 }));
  let severitySum = 0;
  let strong = 0;

  for (const row of rows) {
    hourSums[row.hour].count += 1;
    hourSums[row.hour].severity += row.severity;
    grid[row.weekday - 1][row.hour] += 1;
    weekdays[row.weekday - 1] += 1;
    severities[row.severity - 1].count += 1;
    severitySum += row.severity;
    if (isStrong(row.severity)) strong += 1;
  }

  const hours: HourBucket[] = hourSums.map((entry, hour) => ({
    hour,
    count: entry.count,
    averageSeverity: average(entry.severity, entry.count),
  }));

  /* Timeline — every day or week of the period, empty ones included -- */
  const bucketKey = (day: string) => (period.granularity === "week" ? weekStart(day) : day);
  const timelineMap = new Map<string, TimelineBucket & { severitySum: number }>();
  const lastKey = bucketKey(period.endDay);
  for (let key = bucketKey(period.startDay); key <= lastKey; ) {
    timelineMap.set(key, {
      key,
      label: period.granularity === "week" ? `KW ${isoWeek(key)}` : formatShortDay(key),
      longLabel:
        period.granularity === "week"
          ? `Woche ab ${formatLongDay(key < period.startDay ? period.startDay : key)}`
          : formatLongDay(key),
      count: 0,
      strong: 0,
      averageSeverity: null,
      severitySum: 0,
    });
    key = addDays(key, period.granularity === "week" ? 7 : 1);
  }
  for (const row of rows) {
    const bucket = timelineMap.get(bucketKey(row.day));
    if (!bucket) continue;
    bucket.count += 1;
    bucket.severitySum += row.severity;
    if (isStrong(row.severity)) bucket.strong += 1;
  }
  const timeline: TimelineBucket[] = [...timelineMap.values()].map(
    ({ severitySum, ...bucket }) => ({
      ...bucket,
      averageSeverity: average(severitySum, bucket.count),
    }),
  );

  /* Streets -------------------------------------------------------- */
  const streetMap = new Map<string, { count: number; severity: number; latest: string }>();
  for (const row of rows) {
    if (!row.street) continue;
    const entry = streetMap.get(row.street) ?? { count: 0, severity: 0, latest: row.reportedAt };
    entry.count += 1;
    entry.severity += row.severity;
    if (row.reportedAt > entry.latest) entry.latest = row.reportedAt;
    streetMap.set(row.street, entry);
  }
  const streets: StreetStat[] = [...streetMap.entries()]
    .map(([street, entry]) => ({
      street,
      count: entry.count,
      averageSeverity: entry.severity / entry.count,
      lastReportAt: entry.latest,
    }))
    .sort((a, b) => b.count - a.count || b.lastReportAt.localeCompare(a.lastReportAt));

  /* Wind ----------------------------------------------------------- */
  const wind = analyseWind(rows, input.windHistory, input.reference);

  const analytics: Analytics = {
    period,
    total,
    averageSeverity: average(severitySum, total),
    strong,
    streets: streets.slice(0, 6),
    hours,
    grid,
    weekdays,
    timeline,
    severities,
    wind,
    map: mapFields(rows, input.reference, input.admin ? 1 : MIN_REPORTS_PER_FIELD),
    takeaways: [],
    admin: input.admin ? adminInsights(rows, input.admin.hidden) : null,
  };

  analytics.takeaways = takeaways(analytics);
  return analytics;
}

function analyseWind(
  rows: AnalyticsRow[],
  history: WindHour[] | null,
  reference: Point,
): Analytics["wind"] {
  const sectorCounts = SECTORS.map(() => ({ count: 0, severity: 0 }));
  const speedCounts = SPEED_BUCKETS.map(() => 0);
  let withDirection = 0;
  let withSpeed = 0;
  let calm = 0;

  for (const row of rows) {
    if (row.windSpeedKmh !== null) {
      withSpeed += 1;
      speedCounts[speedIndex(row.windSpeedKmh)] += 1;
    }
    if (row.windDirectionDeg === null || row.windSpeedKmh === null) continue;
    if (row.windSpeedKmh < CALM_BELOW_KMH) {
      calm += 1;
      continue;
    }
    withDirection += 1;
    const sector = sectorCounts[sectorIndex(row.windDirectionDeg)];
    sector.count += 1;
    sector.severity += row.severity;
  }

  // Baseline: the same statistics over every hour of the period.
  const directional = history?.filter((hour) => hour.speedKmh >= CALM_BELOW_KMH) ?? null;
  const baselineSectors = SECTORS.map(() => 0);
  const baselineSpeeds = SPEED_BUCKETS.map(() => 0);
  const baselineDegrees = Array<number>(360).fill(0);
  for (const hour of history ?? []) baselineSpeeds[speedIndex(hour.speedKmh)] += 1;
  for (const hour of directional ?? []) {
    baselineSectors[sectorIndex(hour.directionDeg)] += 1;
    baselineDegrees[((Math.round(hour.directionDeg) % 360) + 360) % 360] += 1;
  }
  const hasBaseline = Boolean(history && history.length > 0 && directional && directional.length > 0);

  const sectors: WindSector[] = SECTORS.map((sector, index) => ({
    ...sector,
    degrees: index * 45,
    count: sectorCounts[index].count,
    share: withDirection > 0 ? sectorCounts[index].count / withDirection : 0,
    averageSeverity: average(sectorCounts[index].severity, sectorCounts[index].count),
    baselineShare: hasBaseline ? baselineSectors[index] / directional!.length : null,
  }));

  const speeds: SpeedBucket[] = SPEED_BUCKETS.map((bucket, index) => ({
    label: bucket.label,
    count: speedCounts[index],
    share: withSpeed > 0 ? speedCounts[index] / withSpeed : 0,
    baselineShare: hasBaseline ? baselineSpeeds[index] / history!.length : null,
  }));

  /** Share of baseline hours whose wind came from within the cone around `direction`. */
  const baselineShareFrom = (direction: number): number => {
    let hits = 0;
    const centre = Math.round(direction);
    for (let delta = -DOWNWIND_HALF_ANGLE; delta <= DOWNWIND_HALF_ANGLE; delta += 1) {
      hits += baselineDegrees[(((centre + delta) % 360) + 360) % 360];
    }
    return hits / directional!.length;
  };

  const downwind: DownwindStats = {
    eligible: 0,
    downwind: 0,
    share: null,
    expectedShare: null,
    verdict: null,
    calm: 0,
    nearSite: 0,
    unknown: 0,
  };
  let expectedSum = 0;

  for (const row of rows) {
    if (
      row.latitude === null ||
      row.longitude === null ||
      row.windDirectionDeg === null ||
      row.windSpeedKmh === null
    ) {
      downwind.unknown += 1;
      continue;
    }
    const place = { lat: row.latitude, lon: row.longitude };
    if (distance(reference, place) < NEAR_SITE_METRES) {
      downwind.nearSite += 1;
      continue;
    }
    if (row.windSpeedKmh < CALM_BELOW_KMH) {
      downwind.calm += 1;
      continue;
    }

    // Seen from the report, the slaughterhouse lies in this direction — so
    // that is where the wind has to come from to carry the smell over.
    const sourceDirection = (bearing(reference, place) + 180) % 360;
    downwind.eligible += 1;
    if (angleBetween(row.windDirectionDeg, sourceDirection) <= DOWNWIND_HALF_ANGLE) {
      downwind.downwind += 1;
    }
    if (hasBaseline) expectedSum += baselineShareFrom(sourceDirection);
  }

  if (downwind.eligible > 0) {
    downwind.share = downwind.downwind / downwind.eligible;
    if (hasBaseline) {
      downwind.expectedShare = expectedSum / downwind.eligible;
      downwind.verdict = compareWithBaseline(
        downwind.downwind,
        downwind.eligible,
        downwind.expectedShare,
      );
    }
  }

  return {
    sectors,
    withDirection,
    calm,
    baselineHours: hasBaseline ? history!.length : null,
    downwind,
    speeds,
  };
}

const DIRECTIONS = [
  "nördlich",
  "nordöstlich",
  "östlich",
  "südöstlich",
  "südlich",
  "südwestlich",
  "westlich",
  "nordwestlich",
];

/** Where a field lies, seen from the slaughterhouse: "600 m nordöstlich". */
function fieldLabel(east: number, north: number): string {
  if (east === 0 && north === 0) return "am Schlachthof";
  const metres = Math.hypot(east, north) * MAP_FIELD_METRES;
  const degrees = ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
  return `${Math.round(metres / 100) * 100} m ${DIRECTIONS[sectorIndex(degrees)]}`;
}

/**
 * Snaps every located report to a grid of fields around the reference point
 * and keeps the fields that reach the minimum. Exact positions stop here —
 * only field indices leave this function.
 */
function mapFields(rows: AnalyticsRow[], reference: Point, minimum: number): MapStats {
  const fields = new Map<string, { east: number; north: number; count: number; severity: number }>();
  let located = 0;

  for (const row of rows) {
    if (row.latitude === null || row.longitude === null) continue;
    located += 1;
    const { east, north } = offset(reference, { lat: row.latitude, lon: row.longitude });
    const field = {
      east: Math.round(east / MAP_FIELD_METRES),
      north: Math.round(north / MAP_FIELD_METRES),
    };
    const key = `${field.east}:${field.north}`;
    const entry = fields.get(key) ?? { ...field, count: 0, severity: 0 };
    entry.count += 1;
    entry.severity += row.severity;
    fields.set(key, entry);
  }

  const shown = [...fields.values()].filter((field) => field.count >= minimum);
  const shownReports = shown.reduce((sum, field) => sum + field.count, 0);

  return {
    reference,
    fields: shown
      .map(({ severity, ...field }) => ({
        ...field,
        averageSeverity: severity / field.count,
        label: fieldLabel(field.east, field.north),
      }))
      .sort((a, b) => b.count - a.count),
    minimum,
    suppressedShare: located > 0 ? (located - shownReports) / located : 0,
  };
}

function adminInsights(rows: AnalyticsRow[], hidden: number): AdminInsights {
  const perSender = new Map<string, number>();
  for (const row of rows) {
    if (row.reporterHash) perSender.set(row.reporterHash, (perSender.get(row.reporterHash) ?? 0) + 1);
  }
  const busiest = Math.max(0, ...perSender.values());
  const withSender = [...perSender.values()].reduce((sum, count) => sum + count, 0);

  const count = (test: (row: AnalyticsRow) => boolean) => rows.filter(test).length;

  return {
    hidden,
    channels: {
      shortcut: count((row) => row.source === "shortcut"),
      web: count((row) => row.source === "web"),
    },
    senders: perSender.size,
    topSenderShare: withSender > 0 ? busiest / withSender : null,
    completeness: [
      { label: "Straße erkannt", count: count((row) => row.street !== null) },
      { label: "Wetterdaten ergänzt", count: count((row) => row.weatherStatus === "ok") },
      { label: "Geruchsart angegeben", count: count((row) => row.odorType !== null) },
      { label: "Dauer angegeben", count: count((row) => row.duration !== null) },
      { label: "Kommentar geschrieben", count: count((row) => row.hasComment) },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Takeaways                                                           */
/* ------------------------------------------------------------------ */

const MAX_TAKEAWAYS = 5;

/** The three-hour window with the most reports; it may wrap past midnight. */
function busiestWindow(hours: HourBucket[]): { start: number; count: number } {
  let best = { start: 0, count: -1 };
  for (let start = 0; start < 24; start += 1) {
    const count = [0, 1, 2].reduce((sum, step) => sum + hours[(start + step) % 24].count, 0);
    if (count > best.count) best = { start, count };
  }
  return best;
}

function windowLabel(start: number): string {
  const end = start + 3 > 24 ? (start + 3) % 24 : start + 3;
  return `zwischen ${start} und ${end} Uhr`;
}

/**
 * Plain German statements about the period, strongest first. Each one is
 * only made when the data carries it — below the thresholds the page says
 * that the pattern is still forming instead of guessing.
 */
function takeaways(data: Analytics): Takeaway[] {
  if (data.total === 0) return [];

  if (data.total < MIN_REPORTS_FOR_PATTERNS) {
    return [
      {
        kind: "sparse",
        parts: [
          "In diesem Zeitraum gibt es noch ",
          { strong: "zu wenige Meldungen" },
          " für belastbare Muster. Jede weitere Meldung schärft das Bild.",
        ],
      },
    ];
  }

  const list: Takeaway[] = [];

  const window = busiestWindow(data.hours);
  const windowShare = window.count / data.total;
  // Three of 24 hours hold 12.5 % by chance. The busiest of 24 windows needs
  // a wide margin before it counts as a cluster rather than a fluke.
  if (windowShare >= 0.3 && compareWithBaseline(window.count, data.total, 3 / 24, 3) === "above") {
    list.push({
      kind: "time",
      parts: [
        { strong: percent(windowShare) },
        " der Meldungen fallen in die Zeit ",
        { strong: windowLabel(window.start) },
        ".",
      ],
    });
  }

  const downwind = data.wind.downwind;
  if (downwind.share !== null && downwind.eligible >= MIN_REPORTS_FOR_PATTERNS) {
    const parts: TakeawayPart[] = [
      "Bei ",
      { strong: percent(downwind.share) },
      " der Meldungen wehte der Wind ",
      { strong: "vom Schlachthof herüber" },
    ];
    if (downwind.expectedShare === null || downwind.verdict === null) {
      parts.push(".");
    } else {
      const expected = { strong: percent(downwind.expectedShare) };
      if (downwind.verdict === "above") {
        parts.push(" – über alle Stunden des Zeitraums war das an diesen Orten nur zu ", expected, " der Fall.");
      } else if (downwind.verdict === "below") {
        parts.push(" – seltener als über alle Stunden des Zeitraums (", expected, ").");
      } else if (downwind.verdict === "similar") {
        parts.push(
          " – etwa so oft wie über alle Stunden des Zeitraums (",
          expected,
          "). Ein Zusammenhang mit der Windrichtung zeigt sich bisher nicht.",
        );
      } else {
        parts.push(
          ", über alle Stunden des Zeitraums waren es ",
          expected,
          ". Ob das mehr als Zufall ist, zeigt sich erst mit weiteren Meldungen.",
        );
      }
    }
    list.push({ kind: "wind", parts });
  }

  list.push({
    kind: "strength",
    parts: [
      { strong: percent(data.strong / data.total) },
      " der Meldungen waren ",
      { strong: "stark oder extrem" },
      " (Stufe 4–5).",
    ],
  });

  const topSector = [...data.wind.sectors].sort((a, b) => b.count - a.count)[0];
  if (data.wind.withDirection >= 8 && topSector && topSector.share >= 0.25) {
    const comparison =
      topSector.baselineShare === null
        ? ""
        : compareWithBaseline(
              topSector.count,
              data.wind.withDirection,
              topSector.baselineShare,
              2.5,
            ) === "above"
          ? `, aber nur ${percent(topSector.baselineShare)} aller Stunden`
          : `, über alle Stunden ${percent(topSector.baselineShare)}`;
    list.push({
      kind: "sector",
      parts: [
        "Am häufigsten kam der Wind aus ",
        { strong: topSector.long },
        ` (${percent(topSector.share)} der Meldungen${comparison}).`,
      ],
    });
  }

  const topWeekday = data.weekdays.indexOf(Math.max(...data.weekdays));
  const weekdayShare = data.weekdays[topWeekday] / data.total;
  // One day in seven holds 14 % by chance; the busiest of seven needs a margin.
  if (
    data.total >= 14 &&
    weekdayShare >= 0.3 &&
    compareWithBaseline(data.weekdays[topWeekday], data.total, 1 / 7, 2.5) === "above"
  ) {
    list.push({
      kind: "weekday",
      parts: [
        "Auffällig oft wird ",
        { strong: WEEKDAYS[topWeekday].adverb },
        ` gemeldet (${percent(weekdayShare)}).`,
      ],
    });
  }

  const topStreet = data.streets[0];
  if (topStreet && topStreet.count >= 3) {
    list.push({
      kind: "street",
      parts: [
        "Am häufigsten gemeldet: ",
        { strong: topStreet.street },
        ` mit ${topStreet.count} ${reportNoun(topStreet.count)}, Ø\u00a0Stärke ${formatNumber(topStreet.averageSeverity, 1)}.`,
      ],
    });
  }

  return list.slice(0, MAX_TAKEAWAYS);
}
