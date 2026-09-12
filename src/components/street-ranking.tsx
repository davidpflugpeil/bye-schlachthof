import * as React from "react";

import { formatNumber, reportNoun } from "@/lib/format";
import type { StreetStat } from "@/lib/types";
import { Card } from "./ui/card";
import { SeverityMeter } from "./severity";

export interface StreetRankingProps {
  streets: StreetStat[];
  /** German period label, e.g. "Letzte 7 Tage". */
  period: string;
  className?: string;
}

/**
 * Where were most reports filed recently?
 * Street name without the house number — enough to follow how the smell
 * spreads, without making individual flats identifiable.
 */
export function StreetRanking({ streets, period, className }: StreetRankingProps) {
  if (streets.length === 0) {
    return (
      <Card tone="muted" className={className}>
        <h2 className="text-base font-bold text-ink">Am häufigsten gemeldet</h2>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
          Sobald Meldungen eingehen, erscheinen hier die betroffenen Straßen.
        </p>
      </Card>
    );
  }

  const maximum = Math.max(...streets.map((entry) => entry.count));

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-bold text-ink">Am häufigsten gemeldet</h2>
        <p className="text-sm text-ink-soft">{period}</p>
      </div>

      <ul className="mt-4 space-y-3">
        {streets.map((entry) => (
          <li key={entry.street}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[0.9375rem] font-semibold text-ink">
                {entry.street}
              </span>
              <span className="shrink-0 text-sm text-ink-soft tabular-nums">
                {entry.count} {reportNoun(entry.count)}
              </span>
            </div>

            <div className="mt-1.5 flex items-center gap-3">
              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                <span
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${Math.max(6, (entry.count / maximum) * 100)}%` }}
                />
              </span>
              <SeverityMeter severity={entry.averageSeverity} size="sm" className="shrink-0" />
              <span className="w-8 shrink-0 text-right text-sm font-semibold text-ink tabular-nums">
                {formatNumber(entry.averageSeverity, 1)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-line pt-3.5 text-sm leading-relaxed text-ink-soft">
        Angezeigt wird die Straße ohne Hausnummer. Ø steht für die durchschnittlich gemeldete
        Stärke.
      </p>
    </Card>
  );
}
