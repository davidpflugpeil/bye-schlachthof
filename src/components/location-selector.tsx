"use client";

import * as React from "react";
import { Crosshair, Loader2, MapPin, Pencil, Search, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  forgetLocation,
  readLocation,
  requestPosition,
  saveLocation,
  LOCATION_ERROR_MESSAGES,
  type LocationError,
  type StoredLocation,
} from "@/lib/location";
import { Button } from "./ui/button";
import { Modal } from "./ui/sheet";
import { inputClasses } from "./ui/form-field";

interface AddressMatch {
  displayName: string;
  label: string;
  latitude: number;
  longitude: number;
}

export interface LocationSelectorProps {
  value: StoredLocation | null;
  onChange: (location: StoredLocation | null) => void;
  className?: string;
}

export function LocationSelector({ value, onChange, className }: LocationSelectorProps) {
  const [locating, setLocating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [remembered, setRemembered] = React.useState(false);

  // Adopt a previously stored address on first render.
  React.useEffect(() => {
    const stored = readLocation();
    if (stored) {
      setRemembered(true);
      onChange(stored);
    }
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function useDevicePosition() {
    setError(null);
    setLocating(true);
    try {
      const position = await requestPosition();
      onChange({
        kind: "device",
        latitude: position.latitude,
        longitude: position.longitude,
        label: "Aktueller Standort",
      });
    } catch (kind) {
      setError(
        LOCATION_ERROR_MESSAGES[kind as LocationError] ?? LOCATION_ERROR_MESSAGES.unavailable,
      );
    } finally {
      setLocating(false);
    }
  }

  function acceptAddress(match: AddressMatch, remember: boolean) {
    const location: StoredLocation = {
      kind: "address",
      latitude: match.latitude,
      longitude: match.longitude,
      label: match.label,
    };
    onChange(location);
    setError(null);
    setDialogOpen(false);
    if (remember) {
      saveLocation(location);
      setRemembered(true);
    } else {
      forgetLocation();
      setRemembered(false);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-brand-soft bg-brand-tint p-3.5 sm:p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            {value.kind === "device" ? (
              <Crosshair className="size-5" aria-hidden />
            ) : (
              <MapPin className="size-5" aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.6875rem] font-semibold tracking-wider text-brand uppercase">
              {value.kind === "device"
                ? "Aktueller Standort"
                : remembered
                  ? "Gespeicherte Adresse"
                  : "Adresse"}
            </p>
            <p className="text-[0.9375rem] leading-snug font-semibold text-ink">
              {value.kind === "device" ? "Wird beim Senden verwendet" : value.label}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="shrink-0"
            aria-label="Standort ändern"
          >
            <Pencil className="size-4 shrink-0" aria-hidden />
            <span className="hidden min-[340px]:inline">ändern</span>
          </Button>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={useDevicePosition}
            loading={locating}
            loadingText="Standort wird ermittelt …"
            className="justify-start sm:justify-center"
          >
            {!locating && <Crosshair className="size-5 shrink-0" aria-hidden />}
            Aktuellen Standort verwenden
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setDialogOpen(true)}
            className="justify-start sm:justify-center"
          >
            <MapPin className="size-5 shrink-0" aria-hidden />
            Adresse eingeben
          </Button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md border border-sev-4-soft bg-sev-4-soft px-3.5 py-2.5 text-sm leading-relaxed text-sev-5"
        >
          {error}
        </p>
      )}

      <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-soft">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-sage" aria-hidden />
        <span>
          Wir benötigen den Standort für Wetter- und Winddaten. Öffentlich angezeigt wird nur die
          Straße – niemals deine Hausnummer.
        </span>
      </p>

      <AddressDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSelect={acceptAddress}
        onUseDevice={() => {
          setDialogOpen(false);
          void useDevicePosition();
        }}
        onForget={() => {
          forgetLocation();
          setRemembered(false);
          onChange(null);
          setDialogOpen(false);
        }}
        hasStored={remembered}
      />
    </div>
  );
}

function AddressDialog({
  open,
  onClose,
  onSelect,
  onUseDevice,
  onForget,
  hasStored,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (match: AddressMatch, remember: boolean) => void;
  onUseDevice: () => void;
  onForget: () => void;
  hasStored: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [matches, setMatches] = React.useState<AddressMatch[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searched, setSearched] = React.useState(false);
  const [remember, setRemember] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setMatches([]);
      setSearched(false);
    }
  }, [open]);

  React.useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setMatches([]);
      setSearched(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/addresses?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as { matches?: AddressMatch[] };
        setMatches(data.matches ?? []);
        setSearched(true);
      } catch {
        if (!controller.signal.aborted) {
          setMatches([]);
          setSearched(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 380);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Wo nimmst du den Geruch wahr?"
      description="Straße und Hausnummer genügen. Veröffentlicht wird später nur die Straße."
    >
      <div className="space-y-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            type="text"
            inputMode="search"
            autoComplete="street-address"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="z. B. Zenettistraße 12, München"
            aria-label="Adresse suchen"
            className={cn(inputClasses, "pl-11")}
          />
          {loading && (
            <Loader2
              className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 animate-spin text-ink-faint"
              aria-hidden
            />
          )}
        </div>

        {matches.length > 0 && (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {matches.map((match, index) => (
              <li key={`${match.latitude}-${match.longitude}-${index}`}>
                <button
                  type="button"
                  onClick={() => onSelect(match, remember)}
                  className="flex w-full items-start gap-3 bg-surface px-4 py-3.5 text-left transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem] font-semibold text-ink">
                      {match.label}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-ink-soft">
                      {match.displayName}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {searched && !loading && matches.length === 0 && (
          <p className="rounded-lg border border-line bg-surface-muted px-4 py-3.5 text-sm text-ink-soft">
            Zu dieser Eingabe wurde nichts gefunden. Versuche es mit Straße und Ort, zum Beispiel
            „Tumblingerstraße, München“.
          </p>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface-muted p-3.5">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]"
          />
          <span className="text-sm leading-relaxed text-ink-soft">
            <span className="block font-semibold text-ink">Adresse auf diesem Gerät merken</span>
            Dann musst du sie beim nächsten Mal nicht erneut eingeben. Die Adresse wird nur lokal
            gespeichert.
          </span>
        </label>

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <Button variant="subtle" size="md" fullWidth onClick={onUseDevice}>
            <Crosshair className="size-4" aria-hidden />
            Stattdessen aktuellen Standort verwenden
          </Button>
          {hasStored && (
            <Button variant="ghost" size="sm" fullWidth onClick={onForget}>
              Gespeicherte Adresse entfernen
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
