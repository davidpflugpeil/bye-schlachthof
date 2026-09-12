import * as React from "react";
import { Clock, Wind } from "lucide-react";

import { cn } from "@/lib/cn";
import { assessSituation } from "@/lib/situation";
import { formatNumber, rainLabel, windDirection } from "@/lib/format";
import type { Situation } from "@/lib/types";
import { ButtonLink } from "./ui/button";
import { WindArrow } from "./ui/weather-badge";
import { RelativeTime } from "./relative-time";

export interface StatusCardProps {
  situation: Situation;
  className?: string;
}

/**
 * Live widget for the current odor situation: state, call to action, context.
 * On large screens it sits in the narrow right-hand column, so the typography
 * is tuned for a compact width.
 */
export function StatusCard({ situation, className }: StatusCardProps) {
  const assessment = assessSituation(situation);
  const weather = situation.weather;
  const direction = windDirection(weather?.windDirectionDeg, "long");
  const hasFooter = Boolean(direction || weather || situation.lastReportAt);

  return (
    <section
      aria-labelledby="situation-headline"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 size-56 rounded-full bg-brand-tint blur-3xl"
      />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5" aria-hidden>
            <span
              className={cn(
                "absolute inline-flex size-full rounded-full motion-safe:animate-[soft-pulse_2.8s_ease-in-out_infinite]",
                assessment.dotColor,
              )}
            />
            <span
              className={cn("relative inline-flex size-2.5 rounded-full", assessment.dotColor)}
            />
          </span>
          <p className="text-sm font-semibold tracking-wide text-ink-soft uppercase">
            Geruchslage in der Nachbarschaft
          </p>
        </div>

        <h1
          id="situation-headline"
          className="mt-3 text-[1.5rem] leading-[1.14] font-bold tracking-[-0.022em] text-ink sm:text-[1.875rem] lg:text-[1.5rem]"
        >
          {assessment.headline}
        </h1>

        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft sm:text-base">
          {assessment.detail}
        </p>

        {/* Five-step meter — never conveyed by colour alone */}
        <div className="mt-4" aria-hidden>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((step) => (
              <span
                key={step}
                className={cn(
                  "h-2 flex-1 rounded-full transition-colors duration-500",
                  step <= Math.max(1, Math.ceil(assessment.fill * 5))
                    ? assessment.barColor
                    : "bg-surface-sunken",
                )}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs font-medium text-ink-faint">
            <span>ruhige Lage</span>
            <span>viele Meldungen</span>
          </div>
        </div>

        <div className="mt-5">
          <ButtonLink
            href="/melden"
            size="xl"
            variant="primary"
            className="w-full sm:w-auto sm:min-w-64 sm:whitespace-nowrap lg:w-full"
          >
            <Wind className="size-5" aria-hidden />
            Geruch melden
          </ButtonLink>
        </div>

        {hasFooter && (
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-[0.9375rem]">
            {direction && (
              <span className="inline-flex items-center gap-2.5">
                <WindArrow degrees={weather?.windDirectionDeg} size={28} />
                <span>
                  <span className="font-semibold text-ink">Wind: {direction}</span>
                  {weather?.windSpeedKmh !== null && weather?.windSpeedKmh !== undefined && (
                    <span className="text-ink-soft">
                      {" "}
                      · {formatNumber(weather.windSpeedKmh, 0)} km/h
                    </span>
                  )}
                </span>
              </span>
            )}
            {weather && <span className="text-ink-soft">{rainLabel(weather.precipitationMm)}</span>}
            {situation.lastReportAt && (
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <Clock className="size-4 text-ink-faint" aria-hidden />
                Letzte Meldung <RelativeTime timestamp={situation.lastReportAt} />
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
