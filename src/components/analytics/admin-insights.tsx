import * as React from "react";
import Link from "next/link";
import { Download, Lock } from "lucide-react";

import { percent, type AdminInsights as Insights } from "@/lib/analytics";
import { reportNoun } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { MeterBar } from "./chart-card";

/**
 * Only rendered for signed-in maintainers: where the reports come from, how
 * concentrated they are, and which optional fields people actually fill in.
 * Nothing here identifies a person — senders are counted, never shown.
 */
export function AdminInsights({ insights, total }: { insights: Insights; total: number }) {
  const share = (count: number) => (total > 0 ? count / total : 0);

  return (
    <section aria-labelledby="verwaltung" className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="verwaltung" className="inline-flex items-center gap-2 text-lg font-bold text-ink sm:text-xl">
          <Lock className="size-4 text-ink-faint" aria-hidden />
          Für die Verwaltung
        </h2>
        <Link href="/admin/export" className={buttonClasses({ variant: "secondary", size: "sm" })}>
          <Download className="size-4" aria-hidden />
          CSV herunterladen
        </Link>
      </div>
      <p className="mt-1 text-[0.9375rem] text-ink-soft">
        Nur angemeldet sichtbar. Bezieht sich auf den gewählten Zeitraum.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Über den Kurzbefehl"
          value={insights.channels.shortcut}
          hint={`${percent(share(insights.channels.shortcut))} der Meldungen`}
        />
        <StatCard
          label="Über die Website"
          value={insights.channels.web}
          hint={`${percent(share(insights.channels.web))} der Meldungen`}
        />
        <StatCard
          label="Absender (geschätzt)"
          value={insights.senders}
          hint={
            insights.topSenderShare === null
              ? undefined
              : `aktivster Absender: ${percent(insights.topSenderShare)}`
          }
        />
        <StatCard
          label="Verborgen"
          value={insights.hidden}
          hint={insights.hidden === 1 ? "Meldung moderiert" : "Meldungen moderiert"}
        />
      </div>

      <Card className="mt-4">
        <h3 className="text-base font-bold text-ink">Was die Meldungen enthalten</h3>
        <ul className="mt-4 space-y-3">
          {insights.completeness.map((entry) => (
            <li
              key={entry.label}
              className="grid grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)_6.5rem] items-center gap-3"
            >
              <span className="text-[0.9375rem] text-ink">{entry.label}</span>
              <MeterBar share={share(entry.count)} className="bg-chart-4" />
              <span className="text-right text-sm text-ink-soft tabular-nums">
                <span className="font-semibold text-ink">{entry.count}</span> ·{" "}
                {percent(share(entry.count))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-line pt-3.5 text-sm leading-relaxed text-ink-soft">
          Absender werden über den Prüfwert aus der IP-Adresse unterschieden, der auch die
          Sperre gegen Massenmeldungen trägt. Ein Haushalt teilt sich oft einen Wert, ein
          Handy wechselt ihn unterwegs – die Zahl ist ein grober Anhaltspunkt, keine Zählung von
          Personen. Grundlage: {total} {reportNoun(total)}.
        </p>
      </Card>
    </section>
  );
}
