"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Wind } from "lucide-react";

import { cn } from "@/lib/cn";
import { MAIN_NAVIGATION, PROJECT_NAME } from "@/lib/navigation";
import { ButtonLink, IconButton } from "./ui/button";
import { BottomSheet } from "./ui/sheet";
import { Logo } from "./logo";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-md">
      <div className="page-shell flex h-16 items-center justify-between gap-3 lg:h-[4.5rem] lg:gap-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-md transition-opacity hover:opacity-85"
        >
          <Logo />
          <span className="text-[0.9375rem] leading-tight font-bold tracking-[-0.01em] whitespace-nowrap text-ink sm:text-base">
            {PROJECT_NAME}
          </span>
        </Link>

        <nav aria-label="Hauptnavigation" className="hidden min-w-0 lg:block">
          <ul className="flex items-center gap-0.5 xl:gap-1">
            {MAIN_NAVIGATION.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center rounded-md px-2.5 text-[0.9375rem] font-medium whitespace-nowrap transition-colors xl:px-3.5",
                    isActive(item.href)
                      ? "bg-surface text-ink shadow-soft"
                      : "text-ink-soft hover:bg-canvas-deep hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink href="/melden" size="md" className="hidden whitespace-nowrap sm:inline-flex">
            <Wind className="size-4" aria-hidden />
            Geruch melden
          </ButtonLink>

          <IconButton
            label="Menü öffnen"
            variant="ghost"
            size="md"
            className="lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-5" aria-hidden />
          </IconButton>
        </div>
      </div>

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menü">
        <nav aria-label="Navigation">
          <ul className="space-y-1">
            {MAIN_NAVIGATION.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex min-h-13 items-center rounded-lg px-4 text-base font-semibold transition-colors",
                    isActive(item.href)
                      ? "bg-brand-tint text-brand-deep"
                      : "text-ink hover:bg-surface-sunken",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <ButtonLink href="/melden" size="lg" fullWidth className="mt-4">
          <Wind className="size-5" aria-hidden />
          Geruch melden
        </ButtonLink>
      </BottomSheet>
    </header>
  );
}
