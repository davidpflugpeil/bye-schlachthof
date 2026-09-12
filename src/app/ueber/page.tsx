import type { Metadata } from "next";
import { BarChart3, ClipboardList, Lock, MapPin, Users, Wind } from "lucide-react";

import { totalReportCount, currentSituation } from "@/lib/db";
import { reportNoun } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Über das Projekt",
  description:
    "Warum wir Geruchsmeldungen sammeln, wie die Stadt sie nutzt, was gespeichert wird und was öffentlich sichtbar ist.",
};

export default async function AboutPage() {
  const total = await totalReportCount();
  const situation = await currentSituation();

  return (
    <div className="page-shell py-6 sm:py-10">
      <div className="max-w-3xl">
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.022em] text-ink sm:text-[2.25rem]">
          Über das Projekt
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft sm:text-lg">
          Die Stadt prüft den Schlachthof bereits mit Stichproben vor Ort. Damit sie dabei die
          richtigen Zeitpunkte trifft und einzelne Betriebsabläufe als Ursache eingrenzen kann,
          halten wir hier fest, wann und wie stark es in der Nachbarschaft riecht.
        </p>
      </div>

      {total > 0 && (
        <div className="mt-8 grid gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard
            label="Meldungen insgesamt"
            value={total}
            hint="seit Projektstart"
            icon={<ClipboardList className="size-5" aria-hidden />}
          />
          <StatCard
            label="Letzte 7 Tage"
            value={situation.reports7d}
            hint={reportNoun(situation.reports7d)}
            icon={<BarChart3 className="size-5" aria-hidden />}
          />
          <StatCard
            label="Betroffene Straßen"
            value={situation.activeStreets.length || "–"}
            hint={
              situation.activeStreets.length > 0
                ? `${situation.activeStreets[0]}${situation.activeStreets.length > 1 ? " u. a." : ""}`
                : "in den letzten Stunden"
            }
            icon={<MapPin className="size-5" aria-hidden />}
          />
        </div>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="max-w-3xl space-y-8">
          <Section title="Worum es geht">
            <p>
              Im Schlachthofviertel und den angrenzenden Straßen tritt immer wieder deutlich
              wahrnehmbarer Geruch auf. Einzelne Beschwerden bleiben dabei Einzelfälle: Sie sagen
              wenig darüber, wann der Geruch auftritt und unter welchen Bedingungen.
            </p>
            <p>
              Wir stehen deshalb im Austausch mit der Stadt und versuchen es mit diesem Weg. Diese
              Website sammelt die Wahrnehmungen aus der Nachbarschaft an einer Stelle – mit
              Zeitpunkt, Stärke und der Windrichtung, die zu diesem Zeitpunkt herrschte.
            </p>
          </Section>

          <Section title="Was gespeichert wird">
            <ul className="space-y-2.5">
              <Bullet>Zeitpunkt der Meldung</Bullet>
              <Bullet>Gemeldete Stärke von 1 bis 5</Bullet>
              <Bullet>
                Straße und Stadtteil – für die Zuordnung von Wetterdaten und Ausbreitungsrichtung
              </Bullet>
              <Bullet>
                Windrichtung, Windgeschwindigkeit, Niederschlag und Temperatur, automatisch ergänzt
              </Bullet>
              <Bullet>Freiwillige Angaben: Geruchsart, Dauer, Kommentar</Bullet>
            </ul>
            <p>
              Es werden keine Namen, keine E-Mail-Adressen und keine Benutzerkonten erfasst. Eine
              Registrierung ist nicht erforderlich.
            </p>
          </Section>

          <Section title="Was öffentlich sichtbar ist">
            <p>
              Öffentlich sichtbar sind Zeitpunkt, Stärke, die Straße und der Stadtteil sowie die
              Wetterangaben. Die Hausnummer und die genauen Koordinaten werden nie veröffentlicht –
              sie bleiben im internen Verwaltungsbereich.
            </p>
            <p>
              Die Straße ist wichtig, weil sich Geruch entlang der Windrichtung ausbreitet. Erst
              damit lässt sich nachvollziehen, welche Bereiche wann betroffen waren.
            </p>
          </Section>

          <Section title="Wozu die Daten verwendet werden">
            <p>
              Die Stadt führt am Schlachthof bereits Stichproben durch. Was dabei fehlt, ist der
              Zusammenhang: zu welchen Zeiten der Geruch auftritt, wie stark er ist und aus welcher
              Richtung der Wind kam. Erst damit lassen sich die Kontrollen gezielt ansetzen und
              einzelne Betriebsabläufe als Ursache eingrenzen.
            </p>
            <p>
              Es geht darum, die Ursache benennen zu können. Je genauer das gelingt, desto
              konkreter lässt sich an den Abläufen im Betrieb etwas ändern.
            </p>
            <p>
              Die Meldungen sind subjektive Wahrnehmungen und ersetzen keine amtliche Messung. Genau
              deshalb zählt die Menge: Erst viele Angaben über einen längeren Zeitraum ergeben ein
              belastbares Muster.
            </p>
          </Section>

          <Section title="Wer dahintersteht">
            <p>
              Das Projekt wird ehrenamtlich aus der Nachbarschaft betrieben. Es gehört weder zu
              einer Behörde noch zu einem Unternehmen und verfolgt keine kommerziellen Interessen.
              Mit der Stadt stehen wir im Austausch; die Auswertung bleibt davon unabhängig und
              zeigt, was gemeldet wurde – nicht mehr und nicht weniger.
            </p>
          </Section>
        </div>

        <aside className="space-y-4">
          <Card tone="brand">
            <span className="flex size-10 items-center justify-center rounded-full bg-brand text-white">
              <Wind className="size-5" aria-hidden />
            </span>
            <h2 className="mt-3.5 text-base font-bold text-ink">Jetzt mitmachen</h2>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              Eine Meldung dauert weniger als zehn Sekunden – ohne Registrierung.
            </p>
            <ButtonLink href="/melden" size="md" fullWidth className="mt-4">
              Geruch melden
            </ButtonLink>
          </Card>

          <Card>
            <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Lock className="size-5" aria-hidden />
            </span>
            <h2 className="mt-3.5 text-base font-bold text-ink">Datenschutz</h2>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              Was gespeichert wird, wie lange es bleibt und wie du der Speicherung widersprichst.
            </p>
            <ButtonLink href="/datenschutz" variant="secondary" size="md" fullWidth className="mt-4">
              Datenschutz ansehen
            </ButtonLink>
          </Card>

          <Card tone="sand">
            <span className="flex size-10 items-center justify-center rounded-full bg-surface text-ink">
              <Users className="size-5" aria-hidden />
            </span>
            <h2 className="mt-3.5 text-base font-bold text-ink">Nachbarn ansprechen</h2>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              Je mehr Menschen melden, desto aussagekräftiger wird die Auswertung. Teile die Seite
              gern in der Nachbarschaft.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-ink sm:text-[1.375rem]">{title}</h2>
      <div className="mt-3 space-y-3 text-[1.0625rem] leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sage" />
      <span>{children}</span>
    </li>
  );
}
