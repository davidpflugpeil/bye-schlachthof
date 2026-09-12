import {
  checkToken,
  failure,
  intParam,
  optionsResponse,
  readBody,
  success,
} from "@/lib/api";
import { reportMessage, toApiReport } from "@/lib/api-report";
import { recentReportsSince } from "@/lib/db";
import {
  REPORTS_PER_HOUR,
  REPORTS_PER_HOUR_WITH_TOKEN,
  reporterHash,
  submitReport,
} from "@/lib/create-report";

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

  const token = checkToken(request);
  if (token === "invalid") {
    return failure(
      "unauthorized",
      "Das mitgeschickte Token ist nicht gültig. Bitte richte den Kurzbefehl neu ein.",
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

  const result = await submitReport(body, {
    source: token === "valid" ? "shortcut" : "web",
    reporterHash: reporterHash(request),
    maxPerHour: token === "valid" ? REPORTS_PER_HOUR_WITH_TOKEN : REPORTS_PER_HOUR,
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
