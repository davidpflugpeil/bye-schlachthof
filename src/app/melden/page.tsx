import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Smartphone } from "lucide-react";

import { currentSituation } from "@/lib/db";
import { assessSituation } from "@/lib/situation";
import { formatNumber, reportNoun } from "@/lib/format";
import { ReportForm } from "@/components/report-form";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Geruch melden",
  description:
    "Halte in wenigen Sekunden fest, wie stark es gerade riecht. Anonym und ohne Registrierung.",
};

export default async function ReportPage() {
  const situation = await currentSituation();
  const assessment = assessSituation(situation);

  return (
    <div className="page-shell py-6 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="min-w-0 lg:max-w-2xl">
          <ReportForm />
        </div>

        {/* Side column, large screens only */}
        <aside className="hidden space-y-4 lg:block">
          <Card tone="brand">
            <p className="text-sm font-semibold tracking-wide text-brand uppercase">Aktuelle Lage</p>
            <p className="mt-2 text-lg leading-snug font-bold text-ink">
              {assessment.headline}
            </p>
            {situation.reports24h > 0 && (
              <p className="mt-1.5 text-[0.9375rem] text-ink-soft">
                Heute insgesamt {situation.reports24h} {reportNoun(situation.reports24h)}
                {situation.averageSeverity24h !== null &&
                  ` · Ø Stärke ${formatNumber(situation.averageSeverity24h, 1)}`}
              </p>
            )}
            <Link
              href="/"
              className="mt-3.5 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-brand transition-colors hover:text-brand-hover"
            >
              Übersicht ansehen
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Card>

          <Card>
            <h2 className="text-base font-bold text-ink">Was mit deiner Meldung passiert</h2>
            <ul className="mt-3 space-y-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              <li className="flex gap-2.5">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-sage" />
                Zeitpunkt und Stärke werden gespeichert.
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-sage" />
                Windrichtung, Windstärke und Niederschlag werden automatisch ergänzt.
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-sage" />
                Öffentlich sichtbar ist die Straße – die Hausnummer wird nie veröffentlicht.
              </li>
            </ul>
          </Card>

          <Card tone="sand">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
                <Smartphone className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-base font-bold text-ink">Noch schneller melden</h2>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">
                  Mit dem iPhone-Kurzbefehl geht eine Meldung direkt vom Homescreen.
                </p>
                <Link
                  href="/kurzbefehl"
                  className="mt-2.5 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-brand transition-colors hover:text-brand-hover"
                >
                  Kurzbefehl einrichten
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
