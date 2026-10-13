/** Core domain types. Display strings stay German; identifiers are English. */

export type Severity = 1 | 2 | 3 | 4 | 5;

export type OdorType = "rotten" | "blood" | "manure" | "burnt" | "chemical" | "sweet" | "other";

export type Duration = "short" | "persistent" | "recurring";

export type ReportSource = "web" | "shortcut";

export type ReportStatus = "visible" | "hidden";

export type WeatherStatus = "pending" | "ok" | "failed";

export interface Weather {
  windDirectionDeg: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  temperatureC: number | null;
  precipitationMm: number | null;
  pressureHpa: number | null;
  humidityPct: number | null;
  fetchedAt: string;
}

/**
 * Location details from the geocoder. Everything here except `houseNumber` is
 * published; the house number stays inside the admin area and the export.
 */
export interface LocationInfo {
  street: string | null;
  houseNumber: string | null;
  district: string | null;
  postalCode: string | null;
  city: string | null;
}

export interface Report {
  id: number;
  publicId: string;
  reportedAt: string;
  severity: Severity;
  latitude: number | null;
  longitude: number | null;
  street: string | null;
  /** Admin-only — never part of a public response. */
  houseNumber: string | null;
  district: string | null;
  postalCode: string | null;
  city: string | null;
  odorType: OdorType | null;
  duration: Duration | null;
  comment: string | null;
  source: ReportSource;
  status: ReportStatus;
  weatherStatus: WeatherStatus;
  windDirectionDeg: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  temperatureC: number | null;
  precipitationMm: number | null;
  pressureHpa: number | null;
  humidityPct: number | null;
  weatherFetchedAt: string | null;
}

/** Public variant: street without house number, no coordinates. */
export interface PublicReport {
  publicId: string;
  reportedAt: string;
  severity: Severity;
  street: string | null;
  district: string | null;
  odorType: OdorType | null;
  duration: Duration | null;
  windDirectionDeg: number | null;
  windSpeedKmh: number | null;
  precipitationMm: number | null;
}

export interface Situation {
  reports2h: number;
  reports24h: number;
  reports7d: number;
  averageSeverity2h: number | null;
  averageSeverity24h: number | null;
  maxSeverity2h: Severity | null;
  lastReportAt: string | null;
  activeStreets: string[];
  weather: {
    windDirectionDeg: number | null;
    windSpeedKmh: number | null;
    precipitationMm: number | null;
    temperatureC: number | null;
  } | null;
}

export interface StreetStat {
  street: string;
  count: number;
  averageSeverity: number;
  lastReportAt: string;
}

/**
 * One visible report, reduced to what the analytics page aggregates. Time
 * fields are already converted to Munich time by the database.
 */
export interface AnalyticsRow {
  reportedAt: string;
  /** Munich calendar day, YYYY-MM-DD. */
  day: string;
  /** Hour of day in Munich, 0–23. */
  hour: number;
  /** ISO weekday: 1 = Monday … 7 = Sunday. */
  weekday: number;
  severity: Severity;
  street: string | null;
  /** Server-side only — feeds the wind analysis, never rendered. */
  latitude: number | null;
  longitude: number | null;
  odorType: OdorType | null;
  duration: Duration | null;
  hasComment: boolean;
  source: ReportSource;
  /** Server-side only — counted for the admin view, never rendered. */
  reporterHash: string | null;
  weatherStatus: WeatherStatus;
  windDirectionDeg: number | null;
  windSpeedKmh: number | null;
  precipitationMm: number | null;
  temperatureC: number | null;
}

/** One hour of modelled wind at the slaughterhouse — the comparison baseline. */
export interface WindHour {
  /** Local Munich time, "YYYY-MM-DDTHH:00". */
  time: string;
  directionDeg: number;
  speedKmh: number;
}
