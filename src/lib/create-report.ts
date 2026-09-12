import "server-only";

import crypto from "node:crypto";
import { after } from "next/server";

import {
  attachLocation,
  attachWeather,
  createReport,
  rememberIdempotencyKey,
  reportById,
  reportCountFromReporter,
  reportForIdempotencyKey,
} from "./db";
import { isValidCoordinate, resolveLocation, searchAddress } from "./geo";
import { fetchWeather } from "./weather";
import { DURATIONS, ODOR_TYPES } from "./format";
import type { Duration, OdorType, Report, ReportSource, Severity } from "./types";
import type { ErrorCode } from "./api";

/** Maximum reports per sender and hour. */
export const REPORTS_PER_HOUR = 12;
/** For clients with a valid token — a household usually shares one address. */
export const REPORTS_PER_HOUR_WITH_TOKEN = 40;
export const COMMENT_MAX_LENGTH = 500;
export const BACKDATE_HOURS = 24;

const ENRICHMENT_BUDGET_MS = 2500;

export interface SubmitInput {
  severity?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  /** Alternative to coordinates — resolved server-side. */
  address?: unknown;
  odorType?: unknown;
  duration?: unknown;
  comment?: unknown;
  reportedAt?: unknown;
}

export interface SubmitContext {
  source: ReportSource;
  reporterHash: string | null;
  /** Hourly cap for this sender. */
  maxPerHour: number;
  idempotencyKey: string | null;
}

export type SubmitResult =
  | { ok: true; report: Report; duplicate: boolean }
  | { ok: false; code: ErrorCode; message: string };

export function reporterHash(request: Request): string {
  const headers = request.headers;
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "local";
  const salt = process.env.REPORTER_SALT ?? "bye-schlachthof-default-salt";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/* ------------------------------------------------------------------ */
/* Input validation                                                    */
/* ------------------------------------------------------------------ */

function readSeverity(value: unknown): Severity | null {
  const parsed = typeof value === "string" ? Number.parseInt(value.trim(), 10) : value;
  if (typeof parsed !== "number" || !Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    return null;
  }
  return parsed as Severity;
}

function readCoordinate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value.trim().replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readChoice<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase() as T;
  return allowed.includes(normalized) ? normalized : null;
}

function readComment(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, COMMENT_MAX_LENGTH);
  return text.length > 0 ? text : null;
}

function readTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const moment = new Date(value.trim());
  if (Number.isNaN(moment.getTime())) return undefined;
  const now = Date.now();
  // Only plausible timestamps: not in the future, at most 24 hours back.
  if (moment.getTime() > now + 60_000) return undefined;
  if (moment.getTime() < now - BACKDATE_HOURS * 3600_000) return undefined;
  return moment.toISOString();
}

export const ODOR_TYPE_VALUES = ODOR_TYPES.map((o) => o.value) as OdorType[];
export const DURATION_VALUES = DURATIONS.map((d) => d.value) as Duration[];

/* ------------------------------------------------------------------ */
/* Submission                                                          */
/* ------------------------------------------------------------------ */

/**
 * Validates the input, stores the report and enriches it with street,
 * district and weather. The report is kept even when enrichment fails.
 */
export async function submitReport(
  input: SubmitInput,
  context: SubmitContext,
): Promise<SubmitResult> {
  // Already processed? Return the same report instead of creating a second one.
  if (context.idempotencyKey) {
    const known = reportForIdempotencyKey(context.idempotencyKey);
    if (known) return { ok: true, report: known, duplicate: true };
  }

  const severity = readSeverity(input.severity);
  if (!severity) {
    return {
      ok: false,
      code: "severity_missing",
      message: "Bitte gib an, wie stark es gerade riecht – ein Wert zwischen 1 und 5.",
    };
  }

  const location = await resolveInputLocation(input);
  if (!location.ok) return location;

  if (
    context.reporterHash &&
    reportCountFromReporter(context.reporterHash, 60) >= context.maxPerHour
  ) {
    return {
      ok: false,
      code: "too_many_reports",
      message:
        "Es wurden gerade sehr viele Meldungen von diesem Gerät gesendet. Bitte versuche es in einer Stunde noch einmal.",
    };
  }

  let report: Report;
  try {
    report = createReport({
      severity,
      reportedAt: readTimestamp(input.reportedAt),
      latitude: location.latitude,
      longitude: location.longitude,
      odorType: readChoice(input.odorType, ODOR_TYPE_VALUES),
      duration: readChoice(input.duration, DURATION_VALUES),
      comment: readComment(input.comment),
      source: context.source,
      reporterHash: context.reporterHash,
    });
  } catch {
    return {
      ok: false,
      code: "save_failed",
      message: "Die Meldung konnte gerade nicht gespeichert werden. Bitte versuche es noch einmal.",
    };
  }

  if (context.idempotencyKey) {
    try {
      rememberIdempotencyKey(context.idempotencyKey, report.id);
    } catch {
      /* Without the marker the report still works. */
    }
  }

  // Start enrichment and wait briefly — the report is already stored.
  const enrichment = enrich(report.id, location.latitude, location.longitude);
  const finished = await Promise.race([
    enrichment,
    new Promise<false>((resolve) => setTimeout(() => resolve(false), ENRICHMENT_BUDGET_MS)),
  ]);

  if (finished === false) {
    // Finish in the background without delaying the response.
    try {
      after(() => enrichment);
    } catch {
      void enrichment;
    }
    return { ok: true, report, duplicate: false };
  }

  return { ok: true, report: reportById(report.id) ?? report, duplicate: false };
}

type LocationResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; code: ErrorCode; message: string };

/**
 * Coordinates take precedence. If they are missing, a supplied address is
 * resolved — that lets a shortcut be set up with a fixed address without
 * typing coordinates.
 */
async function resolveInputLocation(input: SubmitInput): Promise<LocationResult> {
  const latitude = readCoordinate(input.latitude);
  const longitude = readCoordinate(input.longitude);

  if (isValidCoordinate(latitude, longitude)) {
    return { ok: true, latitude: latitude!, longitude: longitude! };
  }

  const address = typeof input.address === "string" ? input.address.trim() : "";
  if (address.length >= 3) {
    const matches = await searchAddress(address);
    if (matches.length === 0) {
      return {
        ok: false,
        code: "address_not_found",
        message: `Zur Adresse „${address}“ wurde kein Ort gefunden. Versuche es mit Straße und Ort.`,
      };
    }
    return { ok: true, latitude: matches[0].latitude, longitude: matches[0].longitude };
  }

  return {
    ok: false,
    code: "location_missing",
    message:
      "Für die Meldung fehlt noch der Ort. Schicke „latitude“ und „longitude“ oder das Feld „address“.",
  };
}

async function enrich(id: number, lat: number, lon: number): Promise<true> {
  const [weather, location] = await Promise.all([
    fetchWeather(lat, lon).catch(() => null),
    resolveLocation(lat, lon).catch(() => null),
  ]);

  try {
    attachWeather(id, weather);
    attachLocation(id, location);
  } catch {
    /* Database briefly unavailable — the report itself is kept. */
  }

  return true;
}
