import { intParam, optionsResponse, success } from "@/lib/api";
import { situationMessage, toApiReport } from "@/lib/api-report";
import { currentSituation, recentReports } from "@/lib/db";
import { assessSituation } from "@/lib/situation";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return optionsResponse(request, "read");
}

/** Snapshot of the current odor situation with assessment and latest reports. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const limit = intParam(params, "limit", 6, 0, 50);

  const situation = await currentSituation();
  const assessment = assessSituation(situation);

  return success(
    {
      message: situationMessage(
        situation.reports2h,
        situation.averageSeverity2h,
        situation.weather?.windDirectionDeg ?? null,
        situation.weather?.windSpeedKmh ?? null,
      ),
      situation,
      assessment: {
        level: assessment.level,
        headline: assessment.headline,
        detail: assessment.detail,
      },
      latest: limit > 0 ? (await recentReports(limit)).map(toApiReport) : [],
    },
    {
      request,
      access: "read",
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    },
  );
}
