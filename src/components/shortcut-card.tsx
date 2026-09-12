"use client";

import * as React from "react";
import { ArrowRight, Smartphone, X } from "lucide-react";

import { Card } from "./ui/card";
import { ButtonLink, IconButton } from "./ui/button";

export interface ShortcutCardProps {
  className?: string;
}

const STORAGE_KEY = "bye-schlachthof:shortcut-banner";

/** Private windows and blocked site data throw instead of returning null. */
function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dismissed";
  } catch {
    return false;
  }
}

function rememberDismissal(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "dismissed");
  } catch {
    /* Not being able to remember is not a reason to keep the banner open. */
  }
}

/**
 * Full-width banner above the page content. Reporting from the homescreen
 * skips the two slowest steps — unlocking a browser and finding the page — so
 * the offer sits ahead of everything else rather than in the navigation.
 *
 * Someone who already has the shortcut can close it for good. The decision
 * lives in this browser only; the server never learns about it. Because that
 * cannot be read during server rendering, the banner starts hidden and appears
 * once the check is done — which avoids showing a dismissed banner for a frame.
 */
export function ShortcutCard({ className }: ShortcutCardProps) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!wasDismissed()) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <Card tone="brand" className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
          <Smartphone className="size-5.5" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-ink sm:text-[1.0625rem]">
            Melden mit einem Fingertipp
          </h2>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">
            Der Shortcut für iPhone und iPad legt einen Knopf auf deinen Homescreen. Antippen,
            Stärke wählen – fertig, ohne die Website zu öffnen.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <ButtonLink href="/kurzbefehl" size="md" className="flex-1 sm:flex-none">
            Shortcut installieren
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>

          <IconButton
            label="Hinweis ausblenden"
            variant="ghost"
            size="md"
            onClick={() => {
              rememberDismissal();
              setVisible(false);
            }}
          >
            <X className="size-5" aria-hidden />
          </IconButton>
        </div>
      </div>
    </Card>
  );
}
