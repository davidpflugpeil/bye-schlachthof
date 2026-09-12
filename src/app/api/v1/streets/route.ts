import { intParam, optionsResponse, success } from "@/lib/api";
import { streetStats } from "@/lib/db";
import { severityLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return optionsResponse(request, "read");
}

/** Streets with the most reports in the selected period. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const days = intParam(params, "days", 7, 1, 365);
  const limit = intParam(params, "limit", 8, 1, 100);

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const streets = (await streetStats(since, limit)).map((entry) => ({
    street: entry.street,
    count: entry.count,
    averageSeverity: Number(entry.averageSeverity.toFixed(2)),
    averageSeverityLabel: severityLabel(entry.averageSeverity),
    lastReportAt: entry.lastReportAt,
  }));

  return success(
    { windowDays: days, count: streets.length, streets },
    {
      request,
      access: "read",
      headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=300" },
    },
  );
}
