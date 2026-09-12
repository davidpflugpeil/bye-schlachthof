import "server-only";

import { cachedLocation, cacheLocation } from "./db";
import type { LocationInfo } from "./types";

export const MUNICH_CENTER = { lat: 48.1372, lon: 11.5755 };

/** Rough frame around Munich — used only as a plausibility check. */
const FRAME = { latMin: 47.7, latMax: 48.6, lonMin: 10.9, lonMax: 12.2 };

export function isInArea(lat: number, lon: number): boolean {
  return lat >= FRAME.latMin && lat <= FRAME.latMax && lon >= FRAME.lonMin && lon <= FRAME.lonMax;
}

export function isValidCoordinate(lat: unknown, lon: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

/**
 * Cache key for resolved locations: accurate to roughly 11 metres.
 * Fine enough to hit the same street reliably, coarse enough that repeated
 * reports from one address are answered without another lookup.
 */
function locationCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)}:${lon.toFixed(4)}`;
}

const NOMINATIM_HEADERS = {
  "User-Agent": "ByeSchlachthof/0.1 (Nachbarschaftsprojekt Muenchen)",
  "Accept-Language": "de",
};

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  footway?: string;
  residential?: string;
  city_district?: string;
  borough?: string;
  suburb?: string;
  quarter?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  house_number?: string;
  postcode?: string;
}

function streetFrom(address: NominatimAddress | undefined): string | null {
  if (!address) return null;
  return address.road ?? address.pedestrian ?? address.footway ?? address.residential ?? null;
}

function districtFrom(address: NominatimAddress | undefined): string | null {
  if (!address) return null;
  return (
    address.suburb ??
    address.quarter ??
    address.neighbourhood ??
    address.city_district ??
    address.borough ??
    address.town ??
    address.village ??
    address.city ??
    address.municipality ??
    null
  );
}

function cityFrom(address: NominatimAddress | undefined): string | null {
  if (!address) return null;
  return address.city ?? address.town ?? address.village ?? address.municipality ?? null;
}

/**
 * Resolves street, house number, district, postal code and city for a
 * coordinate. Everything but the house number is published; that one is kept
 * for the admin area only.
 */
export async function resolveLocation(lat: number, lon: number): Promise<LocationInfo> {
  const empty: LocationInfo = {
    street: null,
    houseNumber: null,
    district: null,
    postalCode: null,
    city: null,
  };

  const key = locationCacheKey(lat, lon);
  const cached = await cachedLocation(key, lat, lon);
  if (cached) return cached;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", lat.toFixed(6));
    url.searchParams.set("lon", lon.toFixed(6));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
      headers: NOMINATIM_HEADERS,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return empty;

    const data = (await response.json()) as { address?: NominatimAddress };
    const location: LocationInfo = {
      street: streetFrom(data.address),
      houseNumber: data.address?.house_number ?? null,
      district: districtFrom(data.address),
      postalCode: data.address?.postcode ?? null,
      city: cityFrom(data.address),
    };

    if (location.street || location.district) {
      await cacheLocation(key, location, lat, lon);
    }
    return location;
  } catch {
    return empty;
  }
}

export interface AddressMatch {
  /** Full German display name from OpenStreetMap. */
  displayName: string;
  /** Shortened German label for the picker. */
  label: string;
  latitude: number;
  longitude: number;
}

/** Address lookup via OpenStreetMap, biased towards the Munich area. */
export async function searchAddress(query: string): Promise<AddressMatch[]> {
  const term = query.trim();
  if (term.length < 3) return [];

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", term);
    url.searchParams.set("countrycodes", "de");
    url.searchParams.set("limit", "6");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set(
      "viewbox",
      `${FRAME.lonMin},${FRAME.latMax},${FRAME.lonMax},${FRAME.latMin}`,
    );

    const response = await fetch(url, {
      headers: NOMINATIM_HEADERS,
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return [];

    const data = (await response.json()) as {
      display_name: string;
      lat: string;
      lon: string;
      address?: NominatimAddress;
    }[];

    return data
      .map((match) => {
        const address = match.address;
        const street = [address?.road, address?.house_number].filter(Boolean).join(" ");
        const city = cityFrom(address) ?? "";
        const label = [street || address?.suburb || address?.neighbourhood, city]
          .filter(Boolean)
          .join(", ");
        return {
          displayName: match.display_name,
          label: label || match.display_name.split(",").slice(0, 2).join(",").trim(),
          latitude: Number(match.lat),
          longitude: Number(match.lon),
        };
      })
      .filter((match) => Number.isFinite(match.latitude) && Number.isFinite(match.longitude))
      .sort((a, b) => {
        const nearA = isInArea(a.latitude, a.longitude) ? 0 : 1;
        const nearB = isInArea(b.latitude, b.longitude) ? 0 : 1;
        return nearA - nearB;
      });
  } catch {
    return [];
  }
}
