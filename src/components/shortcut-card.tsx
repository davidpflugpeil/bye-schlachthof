import { ArrowRight, Smartphone } from "lucide-react";

import { Card } from "./ui/card";
import { ButtonLink } from "./ui/button";

export interface ShortcutCardProps {
  className?: string;
}

/**
 * Points iPhone owners at the shortcut. Reporting from the homescreen removes
 * the two slowest steps — unlocking a browser and finding the page — so this
 * sits on the front page rather than only in the navigation.
 *
 * Follows the icon-above-title layout of the step cards further down the page.
 */
export function ShortcutCard({ className }: ShortcutCardProps) {
  return (
    <Card tone="brand" className={className}>
      <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
        <Smartphone className="size-5" aria-hidden />
      </span>

      <h2 className="mt-3.5 text-base font-bold text-ink">Melden mit einem Fingertipp</h2>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
        Der Kurzbefehl für iPhone und iPad legt einen Knopf auf deinen Homescreen. Antippen, Stärke
        wählen – fertig, ohne die Website zu öffnen.
      </p>

      <ButtonLink href="/kurzbefehl" size="md" fullWidth className="mt-4">
        Kurzbefehl holen
        <ArrowRight className="size-4" aria-hidden />
      </ButtonLink>
    </Card>
  );
}
