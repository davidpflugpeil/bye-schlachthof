/** Core domain types. Display strings stay German; identifiers are English. */

export type Severity = 1 | 2 | 3 | 4 | 5;

export type OdorType = "rotten" | "blood" | "manure" | "burnt" | "chemical" | "sweet" | "other";

export type Duration = "short" | "persistent" | "recurring";

export type ReportSource = "web" | "shortcut";

/**
 * `pending` is what the surge brake produces: the report is stored and
 * counted, but stays out of the public numbers until somebody has looked at
 * it. Only reached while an unusual number of reports is arriving.
 */
export type ReportStatus = "visible" | "hidden" | "pending";

/** How a reporting client reaches the API. */
export type ClientKind = "web" | "shortcut";

export type ClientStatus = "active" | "revoked";

/**
 * An enrolled client. Carries no account and no personal data — only the
 * knowledge that somebody solved a challenge once and has been reporting
 * since. Enough for a quota, enough to revoke.
 */
export interface ReportingClient {
  id: number;
  publicId: string;
  kind: ClientKind;
  status: ClientStatus;
  createdAt: string;
  lastSeenAt: string | null;
  reportCount: number;
}

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

/** Location details without the house number — exactly what gets published. */
export interface LocationInfo {
  street: string | null;
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
