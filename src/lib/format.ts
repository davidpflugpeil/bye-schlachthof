import type { Duration, OdorType, Severity } from "./types";

export const TIMEZONE = "Europe/Berlin";

/* ------------------------------------------------------------------ */
/* Severity                                                            */
/* ------------------------------------------------------------------ */

export const SEVERITY_LEVELS: {
  value: Severity;
  label: string;
  description: string;
}[] = [
  { value: 1, label: "Kaum", description: "Nur bei genauem Hinriechen wahrnehmbar" },
  { value: 2, label: "Leicht", description: "Deutlich wahrnehmbar, aber nicht störend" },
  { value: 3, label: "Deutlich", description: "Klar wahrnehmbar und unangenehm" },
  { value: 4, label: "Stark", description: "Sehr unangenehm, stört spürbar" },
  { value: 5, label: "Extrem", description: "Kaum auszuhalten, Fenster bleiben zu" },
];

export function severityLabel(severity: number | null | undefined): string {
  if (!severity) return "–";
  return SEVERITY_LEVELS.find((s) => s.value === Math.round(severity))?.label ?? "–";
}

/** Tailwind classes per severity: solid fill, soft background, text colour. */
export const SEVERITY_COLORS: Record<
  Severity,
  { fill: string; soft: string; text: string; border: string; hex: string }
> = {
  1: { fill: "bg-sev-1", soft: "bg-sev-1-soft", text: "text-sev-1", border: "border-sev-1", hex: "#5b7a6b" },
  2: { fill: "bg-sev-2", soft: "bg-sev-2-soft", text: "text-sev-2", border: "border-sev-2", hex: "#8a6b24" },
  3: { fill: "bg-sev-3", soft: "bg-sev-3-soft", text: "text-sev-3", border: "border-sev-3", hex: "#a9591f" },
  4: { fill: "bg-sev-4", soft: "bg-sev-4-soft", text: "text-sev-4", border: "border-sev-4", hex: "#9b3d2a" },
  5: { fill: "bg-sev-5", soft: "bg-sev-5-soft", text: "text-sev-5", border: "border-sev-5", hex: "#7e2b26" },
};

export function severityColors(severity: number | null | undefined) {
  const level = Math.min(5, Math.max(1, Math.round(severity ?? 1))) as Severity;
  return SEVERITY_COLORS[level];
}

/* ------------------------------------------------------------------ */
/* Odor type and duration                                              */
/* ------------------------------------------------------------------ */

export const ODOR_TYPES: { value: OdorType; label: string }[] = [
  { value: "rotten", label: "Faulig" },
  { value: "blood", label: "Blutig / fleischig" },
  { value: "manure", label: "Güllig / tierisch" },
  { value: "burnt", label: "Verbrannt" },
  { value: "chemical", label: "Chemisch" },
  { value: "sweet", label: "Süßlich" },
  { value: "other", label: "Anders" },
];

export const DURATIONS: { value: Duration; label: string }[] = [
  { value: "short", label: "Kurz" },
  { value: "persistent", label: "Anhaltend" },
  { value: "recurring", label: "Immer wieder" },
];

export function odorTypeLabel(type: OdorType | null | undefined): string | null {
  if (!type) return null;
  return ODOR_TYPES.find((o) => o.value === type)?.label ?? null;
}

export function durationLabel(duration: Duration | null | undefined): string | null {
  if (!duration) return null;
  return DURATIONS.find((d) => d.value === duration)?.label ?? null;
}

/* ------------------------------------------------------------------ */
/* Wind                                                                */
/* ------------------------------------------------------------------ */

const COMPASS_POINTS: { short: string; long: string }[] = [
  { short: "N", long: "Nord" },
  { short: "NNO", long: "Nordnordost" },
  { short: "NO", long: "Nordost" },
  { short: "ONO", long: "Ostnordost" },
  { short: "O", long: "Ost" },
  { short: "OSO", long: "Ostsüdost" },
  { short: "SO", long: "Südost" },
  { short: "SSO", long: "Südsüdost" },
  { short: "S", long: "Süd" },
  { short: "SSW", long: "Südsüdwest" },
  { short: "SW", long: "Südwest" },
  { short: "WSW", long: "Westsüdwest" },
  { short: "W", long: "West" },
  { short: "WNW", long: "Westnordwest" },
  { short: "NW", long: "Nordwest" },
  { short: "NNW", long: "Nordnordwest" },
];

export function windDirection(
  degrees: number | null | undefined,
  form: "short" | "long" = "short",
): string | null {
  if (degrees === null || degrees === undefined || !Number.isFinite(degrees)) return null;
  const index = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS_POINTS[index][form];
}

export function windLabel(
  degrees: number | null | undefined,
  speedKmh: number | null | undefined,
  form: "short" | "long" = "long",
): string | null {
  const direction = windDirection(degrees, form);
  if (direction === null && speedKmh === null) return null;
  const parts: string[] = [];
  if (direction) parts.push(direction);
  if (speedKmh !== null && speedKmh !== undefined) {
    parts.push(`${formatNumber(speedKmh, 0)} km/h`);
  }
  return parts.join(" · ");
}

export function rainLabel(mm: number | null | undefined): string {
  if (mm === null || mm === undefined) return "Unbekannt";
  if (mm <= 0) return "Kein Regen";
  if (mm < 0.5) return "Leichter Regen";
  if (mm < 2.5) return "Regen";
  return "Starker Regen";
}

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

export function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–";
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** German singular/plural for "Meldung". */
export function reportNoun(count: number): string {
  return count === 1 ? "Meldung" : "Meldungen";
}

/* ------------------------------------------------------------------ */
/* Time                                                                */
/* ------------------------------------------------------------------ */

const timeFormat = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIMEZONE,
});

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: TIMEZONE,
});

export function formatTime(iso: string | Date): string {
  return `${timeFormat.format(new Date(iso))} Uhr`;
}

export function formatDate(iso: string | Date): string {
  return dateFormat.format(new Date(iso));
}

/** "vor 18 Minuten", "gerade eben", "gestern, 14:32 Uhr" */
export function relativeTime(iso: string | Date, now: Date = new Date()): string {
  const moment = new Date(iso);
  const seconds = Math.round((now.getTime() - moment.getTime()) / 1000);

  if (seconds < 0) return formatTime(moment);
  if (seconds < 60) return "gerade eben";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} ${minutes === 1 ? "Minute" : "Minuten"}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} ${hours === 1 ? "Stunde" : "Stunden"}`;

  const days = dayDistance(moment, now);
  if (days === 1) return `gestern, ${formatTime(moment)}`;
  if (days < 7) return `vor ${days} Tagen`;

  return `${formatDate(moment)}, ${formatTime(moment)}`;
}

function dayDistance(a: Date, b: Date): number {
  const dayA = dayKey(a);
  const dayB = dayKey(b);
  return Math.round(
    (new Date(`${dayB}T00:00:00Z`).getTime() - new Date(`${dayA}T00:00:00Z`).getTime()) / 86_400_000,
  );
}

/** Date as YYYY-MM-DD in Munich time — needed to compare calendar days. */
function dayKey(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIMEZONE,
  }).format(new Date(iso));
}
