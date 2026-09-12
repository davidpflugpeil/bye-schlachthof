"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/lib/cn";

type ToastKind = "info" | "success" | "error";

interface ToastEntry {
  id: number;
  kind: ToastKind;
  /** German message text. */
  text: string;
}

interface ToastApi {
  show: (text: string, kind?: ToastKind) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast requires ToastProvider.");
  return context;
}

const ICONS: Record<ToastKind, React.ReactNode> = {
  info: <Info className="size-5 shrink-0" aria-hidden />,
  success: <CheckCircle2 className="size-5 shrink-0" aria-hidden />,
  error: <AlertCircle className="size-5 shrink-0" aria-hidden />,
};

const STYLES: Record<ToastKind, string> = {
  info: "bg-ink text-white",
  success: "bg-positive text-white",
  error: "bg-danger text-white",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = React.useState<ToastEntry[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const remove = React.useCallback((id: number) => {
    setEntries((previous) => previous.filter((entry) => entry.id !== id));
  }, []);

  const show = React.useCallback(
    (text: string, kind: ToastKind = "info") => {
      const id = Date.now() + Math.random();
      setEntries((previous) => [...previous.slice(-2), { id, kind, text }]);
      window.setTimeout(() => remove(id), 6500);
    },
    [remove],
  );

  const api = React.useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            aria-atomic="false"
            className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 px-4 sm:top-auto sm:right-6 sm:bottom-6 sm:left-auto sm:items-end sm:px-0"
          >
            {entries.map((entry) => (
              <div
                key={entry.id}
                role="status"
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg px-4 py-3.5 shadow-lifted",
                  "motion-safe:animate-[rise-in_0.28s_var(--ease-out-soft)_both]",
                  STYLES[entry.kind],
                )}
              >
                {ICONS[entry.kind]}
                <p className="flex-1 text-[0.9375rem] leading-snug font-medium">{entry.text}</p>
                <button
                  type="button"
                  onClick={() => remove(entry.id)}
                  aria-label="Hinweis schließen"
                  className="-mt-0.5 -mr-1 shrink-0 rounded p-1 opacity-75 transition-opacity hover:opacity-100"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
