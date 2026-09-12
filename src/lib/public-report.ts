import type { PublicReport, Report } from "./types";

/**
 * Strips everything that could point to a single flat — in particular the
 * house number and the exact coordinates.
 */
export function toPublicReport(report: Report): PublicReport {
  return {
    publicId: report.publicId,
    reportedAt: report.reportedAt,
    severity: report.severity,
    street: report.street,
    district: report.district,
    odorType: report.odorType,
    duration: report.duration,
    windDirectionDeg: report.windDirectionDeg,
    windSpeedKmh: report.windSpeedKmh,
    precipitationMm: report.precipitationMm,
  };
}
