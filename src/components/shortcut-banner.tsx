import { ArrowRight, Smartphone } from "lucide-react";

import { Card } from "./ui/card";
import { ButtonLink } from "./ui/button";
import { ShortcutBannerClose } from "./shortcut-banner-close";
import { BANNER_ELEMENT_ID, BANNER_STORAGE_KEY } from "./shortcut-banner-shared";

export interface ShortcutBannerProps {
  className?: string;
}

/**
 * Runs while the document is still parsing, so a dismissed banner is hidden
 * before the first paint. Rendering the banner only after hydration would be
 * simpler, but then every first visit would shift the whole page downwards the
 * moment it appears.
 */
const HIDE_IF_DISMISSED = `try{if(localStorage.getItem(${JSON.stringify(
  BANNER_STORAGE_KEY,
)})==="dismissed"){document.getElementById(${JSON.stringify(
  BANNER_ELEMENT_ID,
)}).style.display="none"}}catch(e){}`;

/**
 * Full-width banner above the page content. Reporting from the homescreen
 * skips the two slowest steps — unlocking a browser and finding the page — so
 * the offer sits ahead of everything else rather than in the navigation.
 *
 * Anyone who already has the shortcut closes it for good. That decision lives
 * in this browser only and never reaches the server.
 */
export function ShortcutBanner({ className }: ShortcutBannerProps) {
  return (
    <>
      <Card id={BANNER_ELEMENT_ID} tone="brand" className={className}>
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

            <ShortcutBannerClose />
          </div>
        </div>
      </Card>

      {/* After the card, so the element it looks for is already parsed. */}
      <script dangerouslySetInnerHTML={{ __html: HIDE_IF_DISMISSED }} />
    </>
  );
}
