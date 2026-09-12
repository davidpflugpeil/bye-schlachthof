"use client";

import { X } from "lucide-react";

import { IconButton } from "./ui/button";
import { BANNER_ELEMENT_ID, BANNER_STORAGE_KEY } from "./shortcut-banner-shared";

/**
 * Hides the banner directly rather than through React state — the banner is
 * server-rendered, so there is no client state holding its visibility.
 */
export function ShortcutBannerClose() {
  return (
    <IconButton
      label="Hinweis ausblenden"
      variant="ghost"
      size="md"
      onClick={() => {
        try {
          window.localStorage.setItem(BANNER_STORAGE_KEY, "dismissed");
        } catch {
          /* Not being able to remember is no reason to keep it open. */
        }
        const banner = document.getElementById(BANNER_ELEMENT_ID);
        if (banner) banner.style.display = "none";
      }}
    >
      <X className="size-5" aria-hidden />
    </IconButton>
  );
}
