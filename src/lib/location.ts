"use client";

export type LocationKind = "device" | "address";

export interface StoredLocation {
  kind: LocationKind;
  latitude: number;
  longitude: number;
  /** German label shown in the picker. */
  label: string;
}

const STORAGE_KEY = "bye-schlachthof.location";

export function readLocation(): StoredLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredLocation;
    if (
      typeof data?.latitude !== "number" ||
      typeof data?.longitude !== "number" ||
      typeof data?.label !== "string"
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveLocation(location: StoredLocation): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    /* Storage unavailable — reporting still works. */
  }
}

export function forgetLocation(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* See above. */
  }
}

export interface DevicePosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export type LocationError = "denied" | "unavailable" | "timeout";

export function requestPosition(): Promise<DevicePosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject("unavailable" satisfies LocationError);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) reject("denied" satisfies LocationError);
        else if (error.code === error.TIMEOUT) reject("timeout" satisfies LocationError);
        else reject("unavailable" satisfies LocationError);
      },
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 120_000 },
    );
  });
}

/** German messages shown when the device location cannot be used. */
export const LOCATION_ERROR_MESSAGES: Record<LocationError, string> = {
  denied: "Standortzugriff wurde nicht erlaubt. Du kannst stattdessen deine Adresse eingeben.",
  unavailable:
    "Dein Standort konnte nicht ermittelt werden. Gib stattdessen bitte deine Adresse ein.",
  timeout:
    "Die Standortermittlung hat zu lange gedauert. Versuche es erneut oder gib deine Adresse ein.",
};
