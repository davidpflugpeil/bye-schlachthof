import "server-only";

import type { Weather } from "./types";

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
