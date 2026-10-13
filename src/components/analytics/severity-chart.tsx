import * as React from "react";

import { percent } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { SEVERITY_LEVELS, severityColors, reportNoun } from "@/lib/format";
import type { Severity } from "@/lib/types";
import { DataTable, MeterBar } from "./chart-card";

/**
 * How strong were the reports? One row per level, in the severity colours the
 * rest of the app uses — always next to the number and the German label.
 */
export function SeverityChart({
  severities,
  total,
}: {
  severities: { level: Severity; count: number }[];
  total: number;
}) {
  const largest = Math.max(1, ...severities.map((entry) => entry.count));

  return (
    <ul className="space-y-3.5">
      {[...severities].reverse().map((entry) => {
        const colors = severityColors(entry.level);
        const label = SEVERITY_LEVELS[entry.level - 1].label;
        const share = total > 0 ? entry.count / total : 0;
        return (
          <li
            key={entry.level}
            className="grid grid-cols-[1.5rem_4.75rem_minmax(0,1fr)_6rem] items-center gap-3"
            data-tip={`${entry.count} ${reportNoun(entry.count)}`}
            data-tip-label={`Stufe ${entry.level} · ${label} · ${percent(share)}`}
          >
            <span
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-full text-[0.8125rem] font-bold text-white tabular-nums",
                colors.fill,
              )}
            >
              {entry.level}
            </span>
            <span className="text-[0.9375rem] font-medium text-ink">{label}</span>
            <MeterBar share={entry.count / largest} className={colors.fill} />
            <span className="text-right text-sm whitespace-nowrap text-ink-soft tabular-nums">
              <span className="font-semibold text-ink">{entry.count}</span> · {percent(share)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function SeverityTable({
  severities,
  total,
}: {
  severities: { level: Severity; count: number }[];
  total: number;
}) {
  return (
    <DataTable
      columns={[{ label: "Stufe" }, { label: "Meldungen", numeric: true }, { label: "Anteil", numeric: true }]}
      rows={severities.map((entry) => [
        `${entry.level} · ${SEVERITY_LEVELS[entry.level - 1].label}`,
        entry.count,
        percent(total > 0 ? entry.count / total : 0),
      ])}
    />
  );
}
