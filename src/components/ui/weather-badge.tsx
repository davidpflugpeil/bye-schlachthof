import * as React from "react";
import { CloudRain, Droplets, Thermometer, Wind } from "lucide-react";

import { cn } from "@/lib/cn";
import { formatNumber, rainLabel, windDirection } from "@/lib/format";

export interface WeatherBadgeProps {
  windDirectionDeg?: number | null;
  windSpeedKmh?: number | null;
  precipitationMm?: number | null;
  temperatureC?: number | null;
  form?: "short" | "long";
  className?: string;
}

function Badge({
  icon,
  children,
  className,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5",
        "text-sm font-medium text-ink-soft",
        className,
      )}
    >
      <span className="text-sky" aria-hidden>
        {icon}
      </span>
      <span className="text-ink">{children}</span>
    </span>
  );
}

/** Compact weather badges: wind, precipitation, temperature. */
export function WeatherBadge({
  windDirectionDeg,
  windSpeedKmh,
  precipitationMm,
  temperatureC,
  form = "long",
  className,
}: WeatherBadgeProps) {
  const direction = windDirection(windDirectionDeg, form);
  const hasWind = direction !== null || windSpeedKmh !== null;

  if (!hasWind && precipitationMm === null && temperatureC === null) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {hasWind && (
        <Badge icon={<Wind className="size-4" />}>
          <span className="sr-only">Wind aus Richtung </span>
          {[direction, windSpeedKmh != null ? `${formatNumber(windSpeedKmh, 0)} km/h` : null]
            .filter(Boolean)
            .join(" · ")}
        </Badge>
      )}
      {precipitationMm !== null && precipitationMm !== undefined && (
        <Badge
          icon={
            precipitationMm > 0 ? <CloudRain className="size-4" /> : <Droplets className="size-4" />
          }
        >
          {rainLabel(precipitationMm)}
        </Badge>
      )}
      {temperatureC !== null && temperatureC !== undefined && (
        <Badge icon={<Thermometer className="size-4" />}>{formatNumber(temperatureC, 0)} °C</Badge>
      )}
    </div>
  );
}

/** Wind direction as a small arrow, pointing the way the wind blows. */
export function WindArrow({
  degrees,
  className,
  size = 44,
}: {
  degrees: number | null | undefined;
  className?: string;
  size?: number;
}) {
  if (degrees === null || degrees === undefined || !Number.isFinite(degrees)) return null;

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role="img"
      aria-label={`Wind aus ${windDirection(degrees, "long")}`}
    >
      <circle cx="24" cy="24" r="22" className="fill-sky-soft" />
      <circle cx="24" cy="24" r="22" className="fill-none stroke-sky/25" strokeWidth="1" />
      <g transform={`rotate(${(degrees + 180) % 360} 24 24)`}>
        <path
          d="M24 11 L31 33 L24 28.5 L17 33 Z"
          className="fill-sky"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
