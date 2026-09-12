"use client";

import * as React from "react";

import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center py-12 text-center">
      <h1 className="text-[1.5rem] leading-tight font-bold tracking-[-0.022em] text-ink sm:text-[2rem]">
        Da ist etwas schiefgelaufen
      </h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-ink-soft">
        Die Seite konnte gerade nicht vollständig geladen werden. Versuche es bitte noch einmal.
      </p>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Button size="lg" onClick={reset}>
          Erneut versuchen
        </Button>
        <ButtonLink href="/" variant="secondary" size="lg">
          Zur Startseite
        </ButtonLink>
      </div>
    </div>
  );
}
