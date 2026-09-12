import * as React from "react";
import Link from "next/link";

import { MAIN_NAVIGATION, PROJECT_NAME } from "@/lib/navigation";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface-muted sm:mt-24">
      <div className="page-shell py-10 sm:py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <Logo className="h-7 w-auto" />
              <span className="font-bold text-ink">{PROJECT_NAME}</span>
            </div>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
              Gemeinsam dokumentieren wir, wann und wie stark Gerüche in der Nachbarschaft
              auftreten. Anonym, ohne Registrierung.
            </p>
          </div>

          <nav aria-label="Fußzeile">
            <ul className="grid grid-cols-2 gap-x-8 gap-y-2.5 sm:grid-cols-1">
              {MAIN_NAVIGATION.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[0.9375rem] text-ink-soft transition-colors hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/datenschutz"
                  className="text-[0.9375rem] text-ink-soft transition-colors hover:text-ink"
                >
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link
                  href="/impressum"
                  className="text-[0.9375rem] text-ink-soft transition-colors hover:text-ink"
                >
                  Impressum
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-8 border-t border-line pt-6 text-sm text-ink-faint">
          Ein Nachbarschaftsprojekt. Adressdaten von OpenStreetMap, Wetterdaten von Open-Meteo.
        </p>
      </div>
    </footer>
  );
}
