import * as React from "react";
import { MapPin, Wind } from "lucide-react";

import { cn } from "@/lib/cn";
import { durationLabel, odorTypeLabel, severityColors, severityLabel, windLabel } from "@/lib/format";
import type { PublicReport } from "@/lib/types";
import { SeverityMeter } from "./severity";
import { RelativeTime } from "./relative-time";

export interface IncidentCardProps {
  report: PublicReport;
  className?: string;
  /** Denser layout for side-column lists. */
  compact?: boolean;
}

export function IncidentCard({ report, className, compact = false }: IncidentCardProps) {
  const colors = severityColors(report.severity);
  const wind = windLabel(report.windDirectionDeg, report.windSpeedKmh, "short");
  const odorType = odorTypeLabel(report.odorType);
  const duration = durationLabel(report.duration);

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-lg border border-line bg-surface shadow-soft",
        "transition-shadow duration-200 hover:shadow-card",
        compact ? "p-3.5" : "p-4 sm:p-5",
        className,
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", colors.fill)} aria-hidden />

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white tabular-nums",
                colors.fill,
              )}
              aria-hidden
            >
              {report.severity}
            </span>
            <p className="text-[0.9375rem] font-bold text-ink">
              <span className="sr-only">Stärke {report.severity} – </span>
              {severityLabel(report.severity)}
            </p>
          </div>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm text-ink-soft">
            <RelativeTime timestamp={report.reportedAt} className="font-medium text-ink-soft" />
            {report.street && (
              <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap">
                <MapPin className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
                <span className="truncate">{report.street}</span>
              </span>
            )}
            {report.district && (
              <span className="min-w-0 truncate whitespace-nowrap">{report.district}</span>
            )}
          </p>
        </div>

        <SeverityMeter severity={report.severity} size="sm" className="mt-1.5 shrink-0" />
      </div>

      {(wind || odorType || duration) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-3 pl-2 text-sm text-ink-soft">
          {wind && (
            <span className="inline-flex items-center gap-1.5">
              <Wind className="size-3.5 text-sky" aria-hidden />
              <span className="sr-only">Wind aus </span>
              {wind}
            </span>
          )}
          {odorType && (
            <span className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-[0.8125rem] font-medium">
              {odorType}
            </span>
          )}
          {duration && (
            <span className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-[0.8125rem] font-medium">
              {duration}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
