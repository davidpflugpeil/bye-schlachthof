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

  // The token is not a gate — writing is open on purpose and the token only
  // raises the hourly limit. Rejecting a wrong one would drop a real report
  // over a value that grants nothing, so it degrades to an untrusted write and
  // says so in the response instead.
  const token = checkToken(request);
  const trusted = token === "valid";

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
    source: trusted ? "shortcut" : "web",
    reporterHash: reporterHash(request),
    maxPerHour: trusted ? REPORTS_PER_HOUR_WITH_TOKEN : REPORTS_PER_HOUR,
    idempotencyKey,
  });

  if (!result.ok) {
    return failure(result.code, result.message, options);
  }

  // Carried in `message` on purpose: a shortcut usually shows only that field,
  // so a silently ignored token would otherwise never surface.
  const warning =
    token === "invalid"
      ? "Hinweis: Das mitgeschickte Token stimmt nicht und wurde ignoriert."
      : null;

  return success(
    {
      message: [reportMessage(result.report, result.duplicate), warning]
        .filter(Boolean)
        .join(" — "),
      duplicate: result.duplicate,
      tokenAccepted: token === "none" ? null : trusted,
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

  const reports = (await recentReportsSince(hours, limit)).map(toApiReport);

  return success(
    { windowHours: hours, count: reports.length, reports },
    {
      request,
      access: "read",
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    },
  );
}
