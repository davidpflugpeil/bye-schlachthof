import { ArrowRight, BarChart3, ClipboardList, ShieldCheck, Wind } from "lucide-react";

import { currentSituation, recentReports, streetStats } from "@/lib/db";
import { toPublicReport } from "@/lib/public-report";
import { reportNoun } from "@/lib/format";
import { StatusCard } from "@/components/status-card";
import { IncidentCard } from "@/components/incident-card";
import { StreetRanking } from "@/components/street-ranking";
import { ShortcutCard } from "@/components/shortcut-card";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const situation = await currentSituation();
  const latest = (await recentReports(8)).map(toPublicReport);
  const streets = await streetStats(new Date(Date.now() - 7 * 86_400_000).toISOString(), 6);

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      {/*
        One column on phones in a sensible order (situation, note, reports,
        shortcut, streets). Two columns from large widths up — the two wrappers
        collapse via `contents` and turn back into blocks.
      */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-6">
        {/* Main column: what is being reported right now */}
        <div className="contents lg:block">
          <section aria-labelledby="aktuelle-meldungen" className="order-3">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="aktuelle-meldungen" className="text-xl font-bold text-ink sm:text-2xl">
                Aktuelle Meldungen
              </h2>
              {situation.reports24h > 0 && (
                <p className="text-sm text-ink-soft">
                  {situation.reports24h} {reportNoun(situation.reports24h)} in den letzten 24 Stunden
                </p>
              )}
            </div>

            {latest.length === 0 ? (
              <EmptyState
                icon={<Wind className="size-5" aria-hidden />}
                title="Gerade liegen keine aktuellen Geruchsmeldungen vor."
                text="Du nimmst etwas wahr? Dann halte es in wenigen Sekunden fest."
                action={
                  <ButtonLink href="/melden" size="md">
                    Geruch melden
                  </ButtonLink>
                }
              />
            ) : (
              <div className="space-y-2.5">
                {latest.map((report) => (
                  <IncidentCard key={report.publicId} report={report} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Side column: live widget and most-reported streets */}
        <div className="contents lg:block lg:space-y-4">
          <StatusCard situation={situation} className="order-1" />

          <p className="order-2 flex items-start gap-2.5 px-1 text-sm leading-relaxed text-ink-soft">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-sage" aria-hidden />
            <span>
              Keine Registrierung erforderlich. Die Meldungen werden anonym gesammelt – öffentlich
              sichtbar ist nur die Straße, niemals deine Hausnummer.
            </span>
          </p>

          <ShortcutCard className="order-4" />

          <StreetRanking streets={streets} period="Letzte 7 Tage" className="order-5" />
        </div>
      </div>

      {/* Explanation */}
      <section aria-labelledby="wozu" className="mt-8 lg:mt-12">
        <h2 id="wozu" className="text-xl font-bold text-ink sm:text-2xl">
          Wozu werden die Daten gesammelt?
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-[1.0625rem]">
          Gemeinsam dokumentieren wir, wann und wie stark Gerüche in der Nachbarschaft auftreten.
          Jede Meldung hilft, Zeitpunkt und Ausmaß der Geruchsbelastung besser nachvollziehbar zu
          machen.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 sm:gap-4">
          <Step
            icon={<ClipboardList className="size-5" aria-hidden />}
            title="1 · Melden"
            text="Stärke auswählen, Standort bestätigen, fertig. In der Regel dauert das weniger als zehn Sekunden."
          />
          <Step
            icon={<Wind className="size-5" aria-hidden />}
            title="2 · Ergänzen"
            text="Zu jeder Meldung werden automatisch Windrichtung, Windstärke und Niederschlag gespeichert."
          />
          <Step
            icon={<BarChart3 className="size-5" aria-hidden />}
            title="3 · Auswerten"
            text="Aus vielen Meldungen entsteht eine sachliche Übersicht über Zeitpunkte, Häufigkeit und Ausmaß."
          />
        </div>

        <div className="mt-5">
          <ButtonLink href="/ueber" variant="secondary" size="md">
            Mehr über das Projekt
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

function Step({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card tone="plain" className="h-full">
      <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
        {icon}
      </span>
      <h3 className="mt-3.5 text-base font-bold text-ink">{title}</h3>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">{text}</p>
    </Card>
  );
}
