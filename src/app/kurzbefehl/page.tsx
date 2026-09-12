import type { Metadata } from "next";
import { Crosshair, Hand, Home, MapPin, Smartphone, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { baseUrl } from "@/lib/base-url";
import { ButtonLink } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";

export const metadata: Metadata = {
  title: "iPhone-Kurzbefehl",
  description:
    "Mit dem iPhone-Kurzbefehl kannst du eine Meldung in wenigen Sekunden senden – direkt vom Homescreen.",
};

const SETUP_STEPS = [
  {
    icon: <Smartphone className="size-5" aria-hidden />,
    title: "Kurzbefehl hinzufügen",
    text: "Tippe auf den Knopf oben. Die App „Kurzbefehle“ öffnet sich und fragt, ob du den Kurzbefehl hinzufügen möchtest.",
  },
  {
    icon: <Crosshair className="size-5" aria-hidden />,
    title: "Einmalig bestätigen",
    text: "Beim ersten Ausführen fragt dein iPhone nach dem Standort und nach der Erlaubnis, Daten zu senden. Danach nicht mehr.",
  },
  {
    icon: <Home className="size-5" aria-hidden />,
    title: "Auf den Homescreen legen",
    text: "In der App „Kurzbefehle“ auf die drei Punkte tippen und „Zum Home-Bildschirm“ wählen. So ist der Knopf immer griffbereit.",
  },
  {
    icon: <Hand className="size-5" aria-hidden />,
    title: "Melden",
    text: "Ein Fingertipp, kurz die Stärke auswählen – fertig. Die Meldung ist gespeichert.",
  },
];

export default function ShortcutPage() {
  const shortcutUrl = process.env.NEXT_PUBLIC_SHORTCUT_URL?.trim();
  const apiBase = baseUrl();

  return (
    <div className="page-shell py-6 sm:py-10">
      {/* Intro */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-brand uppercase">
            Für iPhone und iPad
          </p>
          <h1 className="mt-1.5 text-[1.75rem] leading-tight font-bold tracking-[-0.022em] text-ink sm:text-[2.25rem]">
            Geruch mit einem Fingertipp melden
          </h1>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft sm:text-lg">
            Mit dem iPhone-Kurzbefehl kannst du eine Meldung in wenigen Sekunden senden – direkt vom
            Homescreen, ohne die Website zu öffnen.
          </p>

          <div className="mt-6">
            {shortcutUrl ? (
              <ButtonLink href={shortcutUrl} size="xl" target="_blank" rel="noopener noreferrer">
                <Sparkles className="size-5" aria-hidden />
                Kurzbefehl installieren
              </ButtonLink>
            ) : (
              <div className="rounded-xl border border-sand bg-sand-soft p-4 sm:p-5">
                <p className="text-[0.9375rem] leading-relaxed text-ink">
                  <span className="font-semibold">Der Kurzbefehl wird gerade fertiggestellt.</span>{" "}
                  Sobald er bereitsteht, erscheint hier ein Knopf zum direkten Installieren. Bis
                  dahin kannst du eine Meldung über die Website abgeben – das dauert ebenfalls nur
                  wenige Sekunden.
                </p>
                <ButtonLink href="/melden" size="md" className="mt-4">
                  Geruch melden
                </ButtonLink>
              </div>
            )}
          </div>
        </div>

        <Card tone="brand" className="hidden self-start lg:block">
          <h2 className="text-base font-bold text-ink">Warum ein Kurzbefehl?</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
            Geruch tritt oft kurz und unerwartet auf. Je weniger Schritte zwischen Wahrnehmung und
            Meldung liegen, desto vollständiger wird die Dokumentation.
          </p>
        </Card>
      </div>

      {/* Two setup variants */}
      <section aria-labelledby="varianten" className="mt-12">
        <h2 id="varianten" className="text-xl font-bold text-ink sm:text-2xl">
          Zwei Möglichkeiten
        </h2>
        <p className="mt-2 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-soft">
          Beide führen zum selben Ergebnis. Wähle, was besser zu dir passt.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Card className="flex h-full flex-col">
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Crosshair className="size-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-lg font-bold text-ink">Mit aktuellem Standort</h3>
            <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-ink-soft">
              Das iPhone ermittelt deinen Standort bei jeder Meldung. Sinnvoll, wenn du dich
              häufiger an unterschiedlichen Orten aufhältst.
            </p>
            <p className="mt-4 border-t border-line pt-3.5 text-sm text-ink-soft">
              Erfordert einmalig die Freigabe des Standorts für die App „Kurzbefehle“.
            </p>
          </Card>

          <Card className="flex h-full flex-col">
            <span className="flex size-11 items-center justify-center rounded-full bg-sand text-ink">
              <MapPin className="size-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-lg font-bold text-ink">Mit gespeicherter Adresse</h3>
            <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-ink-soft">
              Du hinterlegst deine Adresse einmalig. Danach musst du sie nicht erneut eingeben – und
              der Standort muss nicht freigegeben werden.
            </p>
            <p className="mt-4 border-t border-line pt-3.5 text-sm text-ink-soft">
              Gut geeignet, wenn du überwiegend zu Hause meldest.
            </p>
          </Card>
        </div>
      </section>

      {/* Setup steps */}
      <section aria-labelledby="einrichtung" className="mt-12">
        <h2 id="einrichtung" className="text-xl font-bold text-ink sm:text-2xl">
          So richtest du ihn ein
        </h2>

        <ol className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {SETUP_STEPS.map((step, index) => (
            <li key={step.title}>
              <Card className="flex h-full flex-col">
                <div className="flex items-center gap-3">
                  <span className="tabular-nums flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-brand">{step.icon}</span>
                </div>
                <h3 className="mt-3.5 text-base font-bold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {step.text}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* Technical details, deliberately understated */}
      <section className="mt-12 max-w-2xl">
        <details className="group rounded-xl border border-line bg-surface-muted p-4 sm:p-5">
          <summary className="cursor-pointer list-none text-[0.9375rem] font-semibold text-ink-soft transition-colors hover:text-ink">
            Technische Angaben für die manuelle Einrichtung
          </summary>
          <div className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-ink-soft">
            <p>
              Wer den Kurzbefehl selbst zusammenstellen möchte, sendet eine Anfrage vom Typ POST an
              die folgende Adresse. Eine ausführliche Anleitung liegt der Projektdokumentation bei.
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink">
                {apiBase}/api/v1/reports
              </code>
              <CopyButton value={`${apiBase}/api/v1/reports`} label="Adresse kopieren" />
            </div>
            <p>
              Erwartet werden die Felder <code className="text-ink">severity</code> (1–5) und{" "}
              entweder <code className="text-ink">latitude</code> und{" "}
              <code className="text-ink">longitude</code> oder{" "}
              <code className="text-ink">address</code>.
            </p>
          </div>
        </details>
      </section>

      {/* Closing */}
      <section className="mt-12">
        <Card tone="brand" className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Lieber ohne Kurzbefehl?</h2>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">
              Über die Website geht es genauso schnell – und ganz ohne Einrichtung.
            </p>
          </div>
          <ButtonLink href="/melden" size="lg" className="shrink-0">
            Geruch melden
          </ButtonLink>
        </Card>
      </section>
    </div>
  );
}
