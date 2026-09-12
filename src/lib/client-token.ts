import { CLIENT_TOKEN_HEADER } from "./api-headers";

/**
 * Enrollment as it runs in the browser.
 *
 * The visitor notices nothing: the page fetches a task on load, solves it
 * while severity and location are being picked, and keeps the resulting token
 * in local storage. Nobody registers, nobody types anything — the token is
 * simply proof that a real browser once did a second of work here.
 */

const STORAGE_KEY = "bye-schlachthof:client-token";
/** Iterations between two breaks, so the page keeps painting while solving. */
const YIELD_EVERY = 2_000;

export interface Challenge {
  salt: string;
  challenge: string;
  maxNumber: number;
  expires: number;
  signature: string;
}

export type EnrollmentResult = { ok: true; token: string } | { ok: false; message: string };

const GENERIC_ERROR =
  "Die Freischaltung hat nicht geklappt. Bitte prüfe deine Verbindung und lade die Seite neu.";

function storedToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private mode or storage switched off — reporting still works, just in
    // the anonymous tier.
    return null;
  }
}

function rememberToken(token: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* Nothing to do — the token is then only valid for this page view. */
  }
}

export function forgetToken(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing to do. */
  }
}

/** Header for a report, empty when this browser has no token yet. */
export function clientTokenHeaders(): Record<string, string> {
  const token = storedToken();
  return token ? { [CLIENT_TOKEN_HEADER]: token } : {};
}

/**
 * Returns this browser's token and enrolls it first if necessary. Failure is
 * not an error: without a token a report is still accepted, just under the
 * tighter anonymous quota.
 */
export async function ensureClientToken(): Promise<string | null> {
  const existing = storedToken();
  if (existing) return existing;

  const result = await enroll("web");
  if (!result.ok) return null;

  rememberToken(result.token);
  return result.token;
}

/** Runs a full enrollment and returns the new token without storing it. */
export async function enroll(kind: "web" | "shortcut"): Promise<EnrollmentResult> {
  try {
    const challenge = await fetchChallenge();
    if (!challenge) return { ok: false, message: GENERIC_ERROR };

    const number = await solve(challenge);
    if (number === null) return { ok: false, message: GENERIC_ERROR };

    const response = await fetch("/api/v1/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...challenge, number, kind }),
    });

    const data = (await response.json()) as { ok?: boolean; token?: string; message?: string };
    if (!response.ok || !data.ok || !data.token) {
      return { ok: false, message: data.message ?? GENERIC_ERROR };
    }

    return { ok: true, token: data.token };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

async function fetchChallenge(): Promise<Challenge | null> {
  const response = await fetch("/api/v1/clients/challenge", { cache: "no-store" });
  if (!response.ok) return null;

  const data = (await response.json()) as { ok?: boolean; challenge?: Challenge };
  return data.ok && data.challenge ? data.challenge : null;
}

/**
 * Searches for the number the server hashed. Nothing clever to do here —
 * trying them in turn is the work being asked for.
 */
async function solve(challenge: Challenge): Promise<number | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;

  const encoder = new TextEncoder();

  for (let candidate = 0; candidate <= challenge.maxNumber; candidate++) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(`${challenge.salt}${candidate}`),
    );
    if (toHex(digest) === challenge.challenge) return candidate;

    if (candidate % YIELD_EVERY === 0) await breathe();
  }

  return null;
}

function toHex(buffer: ArrayBuffer): string {
  let hex = "";
  for (const byte of new Uint8Array(buffer)) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

/** Hands control back to the browser so scrolling and typing stay smooth. */
function breathe(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
