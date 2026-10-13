"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/cn";

export interface PeriodLink {
  key: string;
  /** German label, e.g. "30 Tage". */
  label: string;
  href: string;
}

interface Tip {
  value: string;
  label: string;
  x: number;
  top: number;
  bottom: number;
}

/**
 * Frame around the analytics content: the period filter on top, and one shared
 * tooltip for every chart below it.
 *
 * Switching the period keeps the current charts on screen, dimmed, until the
 * new numbers arrive — no skeleton, no layout jump. Charts stay server-rendered;
 * a mark only carries `data-tip` (value) and `data-tip-label` (context), and
 * this component shows them on hover, or on tap on touch screens. Every value
 * is also in the table view of its chart, so the tooltip never gates anything.
 */
export function AnalyticsShell({
  periods,
  active,
  summary,
  children,
}: {
  periods: PeriodLink[];
  active: string;
  /** German line next to the filter, e.g. the date range. */
  summary?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [tip, setTip] = React.useState<Tip | null>(null);
  const frame = React.useRef<HTMLDivElement>(null);
  const tooltip = React.useRef<HTMLDivElement>(null);

  const showFor = React.useCallback((target: EventTarget | null) => {
    const mark = target instanceof Element ? target.closest<HTMLElement | SVGElement>("[data-tip]") : null;
    if (!mark || !frame.current?.contains(mark)) {
      setTip(null);
      return;
    }
    const rect = mark.getBoundingClientRect();
    setTip({
      value: mark.dataset.tip ?? "",
      label: mark.dataset.tipLabel ?? "",
      x: rect.left + rect.width / 2,
      top: rect.top,
      bottom: rect.bottom,
    });
  }, []);

  // Place the tooltip above the mark, inside the viewport.
  React.useLayoutEffect(() => {
    const node = tooltip.current;
    if (!node || !tip) return;
    const { offsetWidth: width, offsetHeight: height } = node;
    const left = Math.min(Math.max(8, tip.x - width / 2), window.innerWidth - width - 8);
    const above = tip.top - height - 8;
    node.style.left = `${left}px`;
    node.style.top = `${above >= 8 ? above : tip.bottom + 8}px`;
    node.style.visibility = "visible";
  }, [tip]);

  // A fixed tooltip would drift away from its mark while scrolling.
  React.useEffect(() => {
    if (!tip) return;
    const hide = () => setTip(null);
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("resize", hide);
    };
  }, [tip]);

  // Taps outside the charts close a tooltip opened by touch.
  React.useEffect(() => {
    if (!tip) return;
    const close = (event: PointerEvent) => {
      if (!frame.current?.contains(event.target as Node)) setTip(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [tip]);

  const navigate = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    setTip(null);
    startTransition(() => router.push(href, { scroll: false }));
  };

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <nav aria-label="Zeitraum" className="w-full sm:w-auto">
          <ul className="grid grid-cols-4 gap-1 rounded-lg bg-surface-sunken p-1 sm:inline-flex">
            {periods.map((period) => {
              const current = period.key === active;
              return (
                <li key={period.key}>
                  <Link
                    href={period.href}
                    scroll={false}
                    aria-current={current ? "page" : undefined}
                    onClick={(event) => navigate(event, period.href)}
                    className={cn(
                      "flex min-h-10 items-center justify-center rounded-md px-2 text-[0.9375rem] font-semibold whitespace-nowrap transition-colors duration-200 sm:px-3.5",
                      current ? "bg-surface text-ink shadow-soft" : "text-ink-soft hover:text-ink",
                    )}
                  >
                    {period.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {summary && <p className="text-sm text-ink-soft">{summary}</p>}
      </div>

      <div
        ref={frame}
        aria-busy={pending || undefined}
        className={cn("transition-opacity duration-200", pending && "opacity-55")}
        onPointerOver={(event) => {
          if (event.pointerType !== "touch") showFor(event.target);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") setTip(null);
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "touch") showFor(event.target);
        }}
      >
        {children}
      </div>

      {tip && (
        <div
          ref={tooltip}
          role="tooltip"
          className="pointer-events-none fixed z-50 max-w-60 rounded-md border border-line bg-surface px-3 py-2 shadow-lifted"
          style={{ left: 0, top: 0, visibility: "hidden" }}
        >
          <p className="text-[0.9375rem] leading-snug font-bold text-ink tabular-nums">{tip.value}</p>
          {tip.label && <p className="mt-0.5 text-sm leading-snug text-ink-soft">{tip.label}</p>}
        </div>
      )}
    </>
  );
}
