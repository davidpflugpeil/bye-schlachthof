import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center py-12 text-center">
      <p className="text-sm font-semibold tracking-wide text-brand uppercase">Seite nicht gefunden</p>
      <h1 className="mt-2 text-[1.75rem] leading-tight font-bold tracking-[-0.022em] text-ink sm:text-[2.25rem]">
        Diese Seite gibt es nicht
      </h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-ink-soft">
        Vielleicht wurde die Adresse geändert. Von der Startseite aus findest du alles Weitere.
      </p>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <ButtonLink href="/" size="lg">
          Zur aktuellen Lage
        </ButtonLink>
        <ButtonLink href="/melden" variant="secondary" size="lg">
          Geruch melden
        </ButtonLink>
      </div>
    </div>
  );
}
