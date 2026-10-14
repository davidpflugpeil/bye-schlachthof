import "server-only";

import { unstable_cache } from "next/cache";

import { TIMEZONE } from "./format";
import { SLAUGHTERHOUSE } from "./geo";
import type { Weather, WindHour } from "./types";

interface OpenMeteoResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    surface_pressure?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
  };
}

/**
 * Fetches current weather and wind from Open-Meteo.
 * Returns null on failure — the report is stored either way.
 */
export async function fetchWeather(lat: number, lon: number): Promise<Weather | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat.toFixed(4));
    url.searchParams.set("longitude", lon.toFixed(4));
    url.searchParams.set(
      "current",
      [
        "temperature_2m",
        "relative_humidity_2m",
        "precipitation",
        "surface_pressure",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
      ].join(","),
    );
    url.searchParams.set("wind_speed_unit", "kmh");
    url.searchParams.set("timezone", "Europe/Berlin");

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 0 },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as OpenMeteoResponse;
    const current = data.current;
    if (!current) return null;

    return {
      windDirectionDeg: current.wind_direction_10m ?? null,
      windSpeedKmh: current.wind_speed_10m ?? null,
      windGustKmh: current.wind_gusts_10m ?? null,
      temperatureC: current.temperature_2m ?? null,
      precipitationMm: current.precipitation ?? null,
      pressureHpa: current.surface_pressure ?? null,
      humidityPct: current.relative_humidity_2m ?? null,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

interface OpenMeteoHistory {
  hourly?: {
    time?: string[];
    wind_speed_10m?: (number | null)[];
    wind_direction_10m?: (number | null)[];
  };
}

/** The past does not change, so a fetched range is reused for a few hours. */
const HISTORY_TTL_SECONDS = 3 * 3600;

const localHourFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

/** "YYYY-MM-DDTHH:00" in Munich time — the format Open-Meteo uses for hours. */
function localHourKey(moment: Date): string {
  const parts = Object.fromEntries(
    localHourFormat.formatToParts(moment).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:00`;
}

/**
 * Downloads one date range from the archive. Kept in Next's data cache, which
 * every server instance shares — a cold start reuses the last download instead
 * of waiting for Open-Meteo. Failures throw, so they are never cached.
 */
const cachedWindHours = unstable_cache(
  async (startDay: string, endDay: string): Promise<WindHour[]> => {
    // The historical forecast archive serves the same models as the live
    // forecast used for each report, back to 2022 and up to today.
    const url = new URL("https://historical-forecast-api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", SLAUGHTERHOUSE.lat.toFixed(4));
    url.searchParams.set("longitude", SLAUGHTERHOUSE.lon.toFixed(4));
    url.searchParams.set("start_date", startDay);
    url.searchParams.set("end_date", endDay);
    url.searchParams.set("hourly", "wind_speed_10m,wind_direction_10m");
    url.searchParams.set("wind_speed_unit", "kmh");
    url.searchParams.set("timezone", TIMEZONE);

    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(`Open-Meteo answered ${response.status}`);

    const data = (await response.json()) as OpenMeteoHistory;
    const times = data.hourly?.time ?? [];
    const speeds = data.hourly?.wind_speed_10m ?? [];
    const directions = data.hourly?.wind_direction_10m ?? [];

    const hours: WindHour[] = [];
    times.forEach((time, index) => {
      const speedKmh = speeds[index];
      const directionDeg = directions[index];
      if (typeof speedKmh === "number" && typeof directionDeg === "number") {
        hours.push({ time, directionDeg, speedKmh });
      }
    });
    if (hours.length === 0) throw new Error("Open-Meteo returned no hours");
    return hours;
  },
  ["wind-history"],
  { revalidate: HISTORY_TTL_SECONDS },
);

/**
 * Hourly wind at the slaughterhouse between two Munich days (both inclusive),
 * up to the current hour. It is the baseline the analytics page compares the
 * reports against: how often did the wind blow this way at all? Returns null
 * on failure — the page then shows the reports without the comparison.
 */
export async function fetchWindHistory(
  startDay: string,
  endDay: string,
  now: Date = new Date(),
): Promise<WindHour[] | null> {
  try {
    // Today's later hours are forecasts; cut them off at the current hour.
    const cutoff = localHourKey(now);
    return (await cachedWindHours(startDay, endDay)).filter((hour) => hour.time <= cutoff);
  } catch {
    return null;
  }
}
