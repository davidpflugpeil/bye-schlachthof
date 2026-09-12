import {
  durationLabel,
  formatNumber,
  formatTime,
  odorTypeLabel,
  rainLabel,
  severityLabel,
  windDirection,
  windLabel,
} from "./format";
import type { Report } from "./types";

/**
 * A report as exposed by the API.
 *
 * Every value comes twice: as a stable identifier for processing and as a
 * German string for display. That way neither the web frontend nor the iPhone
 * shortcut needs its own lookup table. House number and coordinates are never
 * included.
 */
export interface ApiReport {
  id: string;
  reportedAt: string;
  /** German time of day, e.g. "10:34 Uhr". */
  time: string;
  severity: number;
  severityLabel: string;
  street: string | null;
  district: string | null;
  city: string | null;
  odorType: string | null;
  odorTypeLabel: string | null;
  duration: string | null;
  durationLabel: string | null;
  wind: {
    directionDeg: number | null;
    direction: string | null;
    directionLabel: string | null;
    speedKmh: number | null;
    label: string | null;
  } | null;
  rain: boolean | null;
  rainLabel: string;
  precipitationMm: number | null;
  temperatureC: number | null;
  source: string;
}

export function toApiReport(report: Report): ApiReport {
  const hasWind = report.windDirectionDeg !== null || report.windSpeedKmh !== null;

  return {
    id: report.publicId,
    reportedAt: report.reportedAt,
    time: formatTime(report.reportedAt),
    severity: report.severity,
    severityLabel: severityLabel(report.severity),
    street: report.street,
    district: report.district,
    city: report.city,
    odorType: report.odorType,
    odorTypeLabel: odorTypeLabel(report.odorType),
    duration: report.duration,
    durationLabel: durationLabel(report.duration),
    wind: hasWind
      ? {
          directionDeg: report.windDirectionDeg,
          direction: windDirection(report.windDirectionDeg, "short"),
          directionLabel: windDirection(report.windDirectionDeg, "long"),
          speedKmh: report.windSpeedKmh,
          label: windLabel(report.windDirectionDeg, report.windSpeedKmh, "long"),
        }
      : null,
    rain: report.precipitationMm === null ? null : report.precipitationMm > 0,
    rainLabel: rainLabel(report.precipitationMm),
    precipitationMm: report.precipitationMm,
    temperatureC: report.temperatureC,
    source: report.source,
  };
}

/**
 * One German sentence a client can display verbatim — for example as the
 * notification after running the shortcut.
 */
export function reportMessage(report: Report, duplicate = false): string {
  const wind = windLabel(report.windDirectionDeg, report.windSpeedKmh, "long");

  // Held back by the surge brake: stored, but not yet part of the public
  // figures. Saying so is fairer than letting the sender believe otherwise.
  const opening = duplicate
    ? "Meldung bereits gespeichert"
    : report.status === "pending"
      ? "Meldung gespeichert und in Prüfung"
      : "Meldung gespeichert";

  const parts = [
    `${opening}: ${report.severity} · ${severityLabel(report.severity)}`,
    formatTime(report.reportedAt),
    report.street,
    wind ? `Wind ${wind}` : null,
    report.precipitationMm !== null && report.precipitationMm > 0
      ? rainLabel(report.precipitationMm)
      : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

/** Short German situation report in one sentence — for shortcuts and speech. */
export function situationMessage(
  reports2h: number,
  averageSeverity: number | null,
  windDirectionDeg: number | null,
  windSpeedKmh: number | null,
): string {
  if (reports2h === 0) return "Derzeit keine aktuellen Geruchsmeldungen.";

  const wind = windLabel(windDirectionDeg, windSpeedKmh, "long");
  const parts = [
    `${reports2h} ${reports2h === 1 ? "Meldung" : "Meldungen"} in den letzten 2 Stunden`,
    averageSeverity !== null ? `Ø Stärke ${formatNumber(averageSeverity, 1)}` : null,
    wind ? `Wind ${wind}` : null,
  ];
  return `${parts.filter(Boolean).join(" · ")}.`;
}
