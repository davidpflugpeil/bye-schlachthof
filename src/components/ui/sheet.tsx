"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";
import { IconButton } from "./button";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** German dialog title. */
  title?: string;
  /** German supporting sentence. */
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Hide the title visually but keep it for screen readers. */
  titleHidden?: boolean;
}

function useOverlay(open: boolean, onClose: () => void) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
      if (event.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => panelRef.current?.focus(), 30);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return { panelRef, mounted };
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      aria-hidden
      className="animate-fade-in fixed inset-0 z-50 bg-ink/35 backdrop-blur-[2px]"
      style={{ animationDuration: "200ms" }}
    />
  );
}

/** A bottom sheet on phones, a centred dialog from tablet width up. */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
  titleHidden,
}: OverlayProps) {
  const { panelRef, mounted } = useOverlay(open, onClose);
  const titleId = React.useId();

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <Backdrop onClose={onClose} />
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          tabIndex={-1}
          className={cn(
            "relative flex max-h-[88vh] w-full flex-col bg-surface shadow-sheet outline-none",
            "rounded-t-2xl sm:max-w-lg sm:rounded-2xl sm:shadow-lifted",
            "motion-safe:animate-[sheet-up_0.32s_var(--ease-out-soft)_both] sm:motion-safe:animate-[rise-in_0.26s_var(--ease-out-soft)_both]",
            className,
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" />

          {title && (
            <div
              className={cn(
                "flex items-start justify-between gap-4 px-5 pt-4 sm:px-6 sm:pt-6",
                titleHidden && "sr-only",
              )}
            >
              <div>
                <h2 id={titleId} className="text-lg font-bold text-ink sm:text-xl">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">
                    {description}
                  </p>
                )}
              </div>
              <IconButton
                label="Schließen"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="-mt-1 -mr-1.5 shrink-0"
              >
                <X className="size-5" aria-hidden />
              </IconButton>
            </div>
          )}

          <div className="safe-bottom min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

/** Centred dialog — also centred on phones, for short inputs. */
export function Modal({ open, onClose, title, description, children, className }: OverlayProps) {
  const { panelRef, mounted } = useOverlay(open, onClose);
  const titleId = React.useId();

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <Backdrop onClose={onClose} />
      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          tabIndex={-1}
          className={cn(
            "relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-surface shadow-sheet outline-none",
            "sm:max-w-md sm:rounded-2xl sm:shadow-lifted",
            "motion-safe:animate-[sheet-up_0.3s_var(--ease-out-soft)_both] sm:motion-safe:animate-[rise-in_0.24s_var(--ease-out-soft)_both]",
            className,
          )}
        >
          {title && (
            <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
              <div>
                <h2 id={titleId} className="text-lg font-bold text-ink sm:text-xl">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">
                    {description}
                  </p>
                )}
              </div>
              <IconButton
                label="Schließen"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="-mt-1 -mr-1.5 shrink-0"
              >
                <X className="size-5" aria-hidden />
              </IconButton>
            </div>
          )}
          <div className="safe-bottom min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
