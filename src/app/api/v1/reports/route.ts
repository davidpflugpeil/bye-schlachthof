import {
  CLIENT_TOKEN_HEADER,
  checkToken,
  failure,
  intParam,
  optionsResponse,
  readBody,
  success,
} from "@/lib/api";
import { reportMessage, toApiReport } from "@/lib/api-report";
import { verifyClientToken } from "@/lib/clients";
import { recentReportsSince } from "@/lib/db";
import { reporterHash, submitReport, type TrustTier } from "@/lib/create-report";
import type { ReportingClient } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return optionsResponse(request, "write");
}

/**
 * Creates a new odor report.
 *
 * Accepts JSON, form data or a query string in the body. Location either via
 * `latitude`/`longitude` or via `address`. With an `Idempotency-Key` a repeated
 * request is not stored twice.
 */
export async function POST(request: Request) {
  const options = { request, access: "write" as const };

  const legacyToken = checkToken(request);
  if (legacyToken === "invalid") {
    return failure(
      "unauthorized",
      "Das mitgeschickte Token ist nicht gültig. Bitte richte den Kurzbefehl neu ein.",
      options,
    );
  }

  const client = verifyClientToken(request.headers.get(CLIENT_TOKEN_HEADER.toLowerCase()));
  if (client.state === "invalid") {
    return failure(
      "unauthorized",
      "Dieses Gerät ist nicht bekannt. Bitte richte den Kurzbefehl neu ein.",
      options,
    );
  }
  if (client.state === "revoked") {
    return failure(
      "token_revoked",
      "Dieses Gerät wurde gesperrt. Bitte melde dich, wenn das ein Versehen ist.",
      options,
    );
  }

  const body = await readBody(request);
  if (!body) {
    return failure(
      "unreadable_body",
      "Die Meldung konnte nicht gelesen werden. Bitte versuche es noch einmal.",
      options,
    );
  }

  const idempotencyKey =
    request.headers.get("idempotency-key")?.trim().slice(0, 120) ||
    (typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim().slice(0, 120) : "") ||
    null;

  const enrolled = client.state === "valid" ? client.client : null;
  const tier = trustTier(enrolled, legacyToken === "valid");

  const result = await submitReport(body, {
    source: tier === "shortcut" ? "shortcut" : "web",
    reporterHash: reporterHash(request),
    tier,
    client: enrolled,
    idempotencyKey,
  });

  if (!result.ok) {
    return failure(result.code, result.message, options);
  }

  return success(
    {
      message: reportMessage(result.report, result.duplicate),
      duplicate: result.duplicate,
      report: toApiReport(result.report),
    },
    { ...options, status: result.duplicate ? 200 : 201 },
  );
}

/**
 * An enrolled device is trusted according to what it was enrolled as. The
 * shared REPORT_TOKEN still grants the shortcut tier so existing setups keep
 * working, but it identifies nobody — every shortcut carries the same copy.
 * Anything without a token falls into the anonymous tier: still allowed,
 * still without an account, only on a shorter leash.
 */
function trustTier(client: ReportingClient | null, legacyToken: boolean): TrustTier {
  if (client) return client.kind === "shortcut" ? "shortcut" : "web";
  return legacyToken ? "shortcut" : "anonymous";
}

/** Public reports from the last hours, newest first. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const limit = intParam(params, "limit", 20, 1, 200);
  const hours = intParam(params, "hours", 48, 1, 24 * 90);

  const reports = recentReportsSince(hours, limit).map(toApiReport);

  return success(
    { windowHours: hours, count: reports.length, reports },
    {
      request,
      access: "read",
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    },
  );
}
