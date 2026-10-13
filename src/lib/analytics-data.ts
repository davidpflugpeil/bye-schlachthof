import "server-only";

import { computeAnalytics, periodFor, type Analytics, type RangeOption } from "./analytics";
import { analyticsRows, firstReportDay, hiddenReportCount, hiddenReportCountSince } from "./db";
import { dayKey } from "./format";
import { SLAUGHTERHOUSE } from "./geo";
import { fetchWindHistory } from "./weather";

/** Everything the analytics page shows for one period, in one call. */
export async function loadAnalytics(
  range: RangeOption,
  options: { admin: boolean },
): Promise<Analytics> {
  const today = dayKey(new Date());
  const period = periodFor(range, today, range.days ? null : await firstReportDay());

  const [rows, windHistory, hidden] = await Promise.all([
    analyticsRows(period.startDay),
    fetchWindHistory(period.startDay, period.endDay),
    // "Gesamt" starts at the first visible report; hidden ones may predate it.
    !options.admin ? 0 : range.days ? hiddenReportCountSince(period.startDay) : hiddenReportCount(),
  ]);

  return computeAnalytics({
    rows,
    period,
    windHistory,
    reference: SLAUGHTERHOUSE,
    admin: options.admin ? { hidden } : null,
  });
}
