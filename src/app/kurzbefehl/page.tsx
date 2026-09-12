import type { Metadata } from "next";
import { Crosshair, Hand, Home, Smartphone, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

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

// Public iCloud link of the published shortcut. NEXT_PUBLIC_SHORTCUT_URL still
// wins when set, so a fork that ships its own shortcut needs no code change.
const SHORTCUT_URL =
  process.env.NEXT_PUBLIC_SHORTCUT_URL?.trim() ||
  "https://www.icloud.com/shortcuts/42f368d5edb34ff1aa619423c5cbcbfa";

export default function ShortcutPage() {
  return (
    <div className="page-shell py-6 sm:py-10">
      {/* Intro */}
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
          <ButtonLink href={SHORTCUT_URL} size="xl" target="_blank" rel="noopener noreferrer">
            <Sparkles className="size-5" aria-hidden />
            Kurzbefehl installieren
          </ButtonLink>
          <p className="mt-3 text-sm text-ink-soft">
            Öffnet die App „Kurzbefehle“ auf iPhone und iPad.
          </p>
        </div>
      </div>

      {/* Walkthrough video */}
      <section aria-labelledby="video" className="mt-12">
        <h2 id="video" className="text-xl font-bold text-ink sm:text-2xl">
          Einrichtung im Video
        </h2>
        <p className="mt-2 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-soft">
          Vom Installieren bis zur ersten Meldung – der ganze Ablauf in gut zwanzig Sekunden.
        </p>

        <figure className="mt-5">
          <video
            className="h-auto w-full max-w-[17rem] rounded-[1.75rem] border border-line bg-surface-muted shadow-sm"
            src="/kurzbefehl.mp4"
            poster="/kurzbefehl-poster.jpg"
            width={600}
            height={1304}
            autoPlay
            loop
            muted
            playsInline
            controls
            aria-describedby="video-beschreibung"
          />
          <figcaption
            id="video-beschreibung"
            className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft"
          >
            Bildschirmaufnahme ohne Ton: Kurzbefehl installieren, auf den Homescreen legen und eine
            Meldung abgeben.
          </figcaption>
        </figure>
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
