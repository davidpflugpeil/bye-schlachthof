import "server-only";

import { hourlyReportCounts, reportCountSince } from "./db";

/**
 * The surge brake.
 *
 * Everything else asks who is sending. This asks how much is arriving, and it
 * is the one measure that still helps when the answer to the first question
 * turns out to be forgeable. Once the last hour runs far above what the
 * quieter weeks looked like, reports from senders without a history stop
 * going straight onto the site: they are stored, they are counted, and they
 * wait for a look in the admin area.
 *
 * That bounds the damage of a flood to a moderation queue instead of a set of
 * public figures nobody can defend afterwards.
 */

/** Below this many reports in an hour nothing is unusual, whatever the median. */
function floor(): number {
  const configured = Number.parseInt(process.env.SURGE_FLOOR ?? "", 10);
  return Number.isFinite(configured) && configured > 0 ? configured : 40;
}

/** How many times the usual hour counts as a surge. */
function factor(): number {
  const configured = Number.parseFloat(process.env.SURGE_FACTOR ?? "");
  return Number.isFinite(configured) && configured > 1 ? configured : 4;
}

/** Days of history the normal case is derived from. */
const BASELINE_DAYS = 14;
const CACHE_MS = 60_000;

export interface SurgeState {
  active: boolean;
  /** Reports in the last hour, any status. */
  lastHour: number;
  /** Median reports per hour over the baseline window. */
  baseline: number;
  /** Value from which the brake engages. */
  threshold: number;
}

let cached: { state: SurgeState; at: number } | null = null;

export function surgeState(): SurgeState {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.state;

  const lastHour = reportCountSince(60);
  const baseline = median(hourlyReportCounts(BASELINE_DAYS));
  const threshold = Math.max(floor(), Math.ceil(baseline * factor()));

  const state: SurgeState = { active: lastHour >= threshold, lastHour, baseline, threshold };
  cached = { state, at: Date.now() };
  return state;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}
