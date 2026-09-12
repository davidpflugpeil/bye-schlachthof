import "server-only";

import { NextResponse } from "next/server";

import { baseUrl } from "./base-url";

export const API_VERSION = "1";
export const TOKEN_HEADER = "X-Report-Token";

/* ------------------------------------------------------------------ */
/* Error codes                                                         */
/* ------------------------------------------------------------------ */

/**
 * Machine-readable error identifiers. Clients switch on these; the German
 * message is meant for display and may change.
 */
export type ErrorCode =
  | "unreadable_body"
  | "severity_missing"
  | "location_missing"
  | "address_not_found"
  | "too_many_reports"
  | "unauthorized"
  | "not_found"
  | "save_failed";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  unreadable_body: 400,
  severity_missing: 400,
  location_missing: 400,
  address_not_found: 422,
  too_many_reports: 429,
  unauthorized: 401,
  not_found: 404,
  save_failed: 500,
};

export const ERROR_CODES = Object.keys(STATUS_BY_CODE) as ErrorCode[];

/* ------------------------------------------------------------------ */
/* CORS                                                               */
/* ------------------------------------------------------------------ */

function allowedOrigins(): string[] {
  const configured = process.env.API_CORS_ORIGINS?.trim();
  if (configured) {
    return configured
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  // Falls back to Vercel's system variables, so a deployment needs no manual
  // URL configuration for same-origin writes to work.
  try {
    return [new URL(baseUrl()).origin];
  } catch {
    return [];
  }
}

export type Access = "read" | "write";

/**
 * Read endpoints serve public data and are open to any origin. Write endpoints
 * only to the configured origins — the iPhone shortcut sends no `Origin` header
 * and is unaffected.
 */
export function corsHeaders(request: Request, access: Access): Record<string, string> {
  const shared = {
    "Access-Control-Allow-Methods": access === "read" ? "GET, OPTIONS" : "POST, OPTIONS",
    "Access-Control-Allow-Headers": `Content-Type, ${TOKEN_HEADER}, Authorization, Idempotency-Key`,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (access === "read") {
    return { ...shared, "Access-Control-Allow-Origin": "*" };
  }

  const origin = request.headers.get("origin");
  const allowed = allowedOrigins();
  if (origin && (allowed.includes("*") || allowed.includes(origin))) {
    return { ...shared, "Access-Control-Allow-Origin": origin };
  }
  return shared;
}

export function optionsResponse(request: Request, access: Access): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request, access) });
}

/* ------------------------------------------------------------------ */
/* Responses                                                           */
/* ------------------------------------------------------------------ */

export interface ResponseOptions {
  request: Request;
  access: Access;
  /** Extra headers, for example Cache-Control. */
  headers?: Record<string, string>;
  status?: number;
}

export function success<T extends Record<string, unknown>>(
  payload: T,
  options: ResponseOptions,
): NextResponse {
  return NextResponse.json(
    { ok: true, ...payload },
    {
      status: options.status ?? 200,
      headers: { ...corsHeaders(options.request, options.access), ...options.headers },
    },
  );
}

/**
 * Error response with a stable code and a German message.
 * `message` repeats that text at the top level so a shortcut can always show
 * one single field, whether the call succeeded or failed.
 */
export function failure(
  code: ErrorCode,
  message: string,
  options: ResponseOptions,
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message }, message },
    {
      status: options.status ?? STATUS_BY_CODE[code],
      headers: { ...corsHeaders(options.request, options.access), ...options.headers },
    },
  );
}

/* ------------------------------------------------------------------ */
/* Token                                                               */
/* ------------------------------------------------------------------ */

export type TokenCheck = "none" | "valid" | "invalid";

/**
 * Writing works without authentication on purpose — the project collects
 * anonymously. A configured `REPORT_TOKEN` marks trusted clients (the
 * shortcut) and raises their hourly limit. A supplied but wrong token is
 * rejected.
 */
export function checkToken(request: Request): TokenCheck {
  const expected = process.env.REPORT_TOKEN?.trim();
  const supplied =
    request.headers.get(TOKEN_HEADER.toLowerCase())?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";

  if (!supplied) return "none";
  if (!expected) return "none";
  return supplied === expected ? "valid" : "invalid";
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

/**
 * Reads JSON, form data or a raw body. Shortcuts occasionally send JSON
 * without a matching `Content-Type` header.
 */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const type = request.headers.get("content-type") ?? "";

  try {
    if (type.includes("application/json")) {
      return (await request.json()) as Record<string, unknown>;
    }

    if (type.includes("form")) {
      const form = await request.formData();
      return Object.fromEntries(form.entries());
    }

    const text = (await request.text()).trim();
    if (!text) return {};
    if (text.startsWith("{")) return JSON.parse(text) as Record<string, unknown>;

    // Last resort: treat it as a query string (severity=4&latitude=…)
    return Object.fromEntries(new URLSearchParams(text).entries());
  } catch {
    return null;
  }
}

export function intParam(
  params: URLSearchParams,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = params.get(name);
  if (raw === null) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
