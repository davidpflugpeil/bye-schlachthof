"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Wind } from "lucide-react";

import { cn } from "@/lib/cn";
import { ButtonLink } from "./ui/button";

/**
 * Always-reachable report button on phones.
 * Appears only once the call to action in the hero scrolls out of view, so it
 * never covers content while the primary button is already visible.
 */
export function StickyCta() {
  const pathname = usePathname();
  const [visible, setVisible] = React.useState(false);

  const hidden = pathname.startsWith("/melden") || pathname.startsWith("/admin");

  React.useEffect(() => {
    if (hidden) return;

    let queued = false;
    const update = () => {
      queued = false;
      setVisible(window.scrollY > 260);
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hidden, pathname]);

  if (hidden) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-30 transition-transform duration-300 ease-[var(--ease-out-soft)] sm:hidden",
        visible ? "translate-y-0" : "translate-y-full",
      )}
      aria-hidden={!visible}
    >
      <div className="h-10 bg-gradient-to-t from-canvas to-transparent" />
      <div
        className={cn(
          "safe-bottom border-t border-line/70 bg-canvas/92 px-4 pt-3 backdrop-blur-md",
          visible && "pointer-events-auto",
        )}
      >
        <ButtonLink href="/melden" size="xl" fullWidth tabIndex={visible ? undefined : -1}>
          <Wind className="size-5" aria-hidden />
          Geruch melden
        </ButtonLink>
      </div>
    </div>
  );
}
