"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Clock, CloudRain, Plus, ShieldCheck, Wind } from "lucide-react";

import { cn } from "@/lib/cn";
import { DURATIONS, ODOR_TYPES, SEVERITY_LEVELS } from "@/lib/format";
import type { ApiReport } from "@/lib/api-report";
import type { Duration, OdorType, Severity } from "@/lib/types";
import type { StoredLocation } from "@/lib/location";
import { Button, ButtonLink } from "./ui/button";
import { Card } from "./ui/card";
import { inputClasses, FormField } from "./ui/form-field";
import { SegmentedControl } from "./ui/segmented-control";
import { useToast } from "./ui/toast";
import { SeveritySelector } from "./severity-selector";
import { LocationSelector } from "./location-selector";
import { SuccessCheck } from "./success-check";

type FormState = "editing" | "submitting" | "saved";

/** Random identifier used as the request's idempotency key. */
function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function ReportForm() {
  const router = useRouter();
  const { show } = useToast();

  const [severity, setSeverity] = React.useState<Severity | null>(null);
  const [location, setLocation] = React.useState<StoredLocation | null>(null);
  const [odorType, setOdorType] = React.useState<OdorType | null>(null);
  const [duration, setDuration] = React.useState<Duration | null>(null);
  const [comment, setComment] = React.useState("");
  const [extrasOpen, setExtrasOpen] = React.useState(false);

  const [state, setState] = React.useState<FormState>("editing");
  const [savedReport, setSavedReport] = React.useState<ApiReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const idempotencyKeyRef = React.useRef<string | null>(null);

  const ready = severity !== null && location !== null;
  const selectedLevel = SEVERITY_LEVELS.find((level) => level.value === severity);

  async function submit() {
    if (!ready || state === "submitting") return;
    setState("submitting");
    setError(null);

    // Stays the same across retries while the form is unchanged.
    const idempotencyKey =
      idempotencyKeyRef.current ?? (idempotencyKeyRef.current = newKey());

    try {
      const response = await fetch("/api/v1/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Prevents a second report if the response is lost in transit.
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          severity,
          latitude: location!.latitude,
          longitude: location!.longitude,
          odorType,
          duration,
          comment: comment.trim() || null,
        }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        error?: { code: string; message: string };
        report?: ApiReport;
      };

      if (!response.ok || !data.ok || !data.report) {
        const text =
          data.error?.message ??
          "Die Meldung konnte gerade nicht vollständig gespeichert werden. Bitte versuche es noch einmal.";
        setError(text);
        show(text, "error");
        setState("editing");
        return;
      }

      setSavedReport(data.report);
      setState("saved");
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      const text =
        "Die Meldung konnte gerade nicht gesendet werden. Prüfe kurz deine Verbindung und versuche es noch einmal.";
      setError(text);
      show(text, "error");
      setState("editing");
    }
  }

  function reset() {
    idempotencyKeyRef.current = null;
    setSeverity(null);
    setOdorType(null);
    setDuration(null);
    setComment("");
    setExtrasOpen(false);
    setSavedReport(null);
    setError(null);
    setState("editing");
  }

  if (state === "saved" && savedReport) {
    return <Confirmation report={savedReport} onNewReport={reset} />;
  }

  return (
    <div className="animate-fade-in">
      <p className="text-sm font-semibold tracking-wide text-brand uppercase">Neue Meldung</p>
      <h1 className="mt-1.5 text-[1.75rem] leading-tight font-bold tracking-[-0.022em] text-ink sm:text-[2rem]">
        Geruch melden
      </h1>
      <p className="mt-2 max-w-xl text-base leading-relaxed text-ink-soft sm:text-[1.0625rem]">
        Zwei Angaben genügen: Wie stark riecht es und wo? Alles Weitere ist freiwillig.
      </p>

      <form
        className="mt-7"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {/* Severity */}
        <section aria-labelledby="question-severity">
          <h2
            id="question-severity"
            className="text-[1.375rem] leading-tight font-bold tracking-[-0.018em] text-ink sm:text-2xl"
          >
            Wie stark riecht es gerade?
          </h2>
          <SeveritySelector value={severity} onChange={setSeverity} className="mt-4" />
          <p
            className="mt-3 min-h-[1.5rem] text-[0.9375rem] text-ink-soft transition-opacity duration-200"
            aria-live="polite"
          >
            {selectedLevel
              ? `${selectedLevel.value} · ${selectedLevel.label} – ${selectedLevel.description}`
              : "Tippe die Stufe an, die am besten passt."}
          </p>
        </section>

        {/* Location */}
        <section
          aria-labelledby="question-location"
          className={cn("mt-8 transition-opacity duration-300", severity === null && "opacity-60")}
        >
          <h2
            id="question-location"
            className="text-[1.375rem] leading-tight font-bold tracking-[-0.018em] text-ink sm:text-2xl"
          >
            Wo nimmst du den Geruch wahr?
          </h2>
          <LocationSelector value={location} onChange={setLocation} className="mt-4" />
        </section>

        {/* Optional details */}
        <section className="mt-8">
          <button
            type="button"
            onClick={() => setExtrasOpen((open) => !open)}
            aria-expanded={extrasOpen}
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-[0.9375rem] font-semibold text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {extrasOpen ? (
              <ChevronDown className="size-4" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            Weitere Angaben
            <span className="text-xs font-medium text-ink-faint">optional</span>
          </button>

          {extrasOpen && (
            <div className="animate-rise-in mt-4 space-y-5 rounded-xl border border-line bg-surface-muted p-4 sm:p-5">
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-ink">Geruchsart</p>
                <SegmentedControl
                  wrap
                  label="Geruchsart"
                  options={ODOR_TYPES}
                  value={odorType}
                  onChange={setOdorType}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-ink">Dauer</p>
                <SegmentedControl
                  wrap
                  label="Dauer"
                  options={DURATIONS}
                  value={duration}
                  onChange={setDuration}
                />
              </div>

              <FormField label="Kommentar" optional hint="Höchstens 500 Zeichen.">
                {(fieldProps) => (
                  <textarea
                    {...fieldProps}
                    rows={3}
                    maxLength={500}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="z. B. besonders auffällig Richtung Hof"
                    className={cn(inputClasses, "resize-y")}
                  />
                )}
              </FormField>
            </div>
          )}
        </section>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-sev-4-soft bg-sev-4-soft px-4 py-3 text-[0.9375rem] leading-relaxed text-sev-5"
          >
            {error}
          </p>
        )}

        {/* Submit */}
        <div className="sticky bottom-0 z-20 -mx-4 mt-7 sm:static sm:mx-0 sm:mt-8">
          <div
            aria-hidden
            className="pointer-events-none h-7 bg-gradient-to-t from-canvas to-transparent sm:hidden"
          />
          <div className="safe-bottom border-t border-line bg-canvas px-4 pt-3.5 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-0">
            <Button
              type="submit"
              size="xl"
              fullWidth
              disabled={!ready}
              loading={state === "submitting"}
              loadingText="Wird gespeichert …"
            >
              Meldung speichern
            </Button>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-sm text-ink-soft sm:mt-3">
              <ShieldCheck className="size-4 shrink-0 text-sage" aria-hidden />
              {ready
                ? "Keine Registrierung erforderlich"
                : severity === null
                  ? "Wähle zuerst die Stärke aus"
                  : "Wähle noch den Ort aus"}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

function Confirmation({
  report,
  onNewReport,
}: {
  report: ApiReport;
  onNewReport: () => void;
}) {
  return (
    <div className="animate-rise-in">
      <div className="flex flex-col items-center pt-2 text-center sm:pt-6">
        <SuccessCheck />
        <h1 className="mt-4 text-[1.625rem] leading-tight font-bold tracking-[-0.022em] text-ink sm:text-[2rem]">
          Meldung gespeichert
        </h1>
        <p className="mt-2.5 max-w-md text-base leading-relaxed text-ink-soft">
          Vielen Dank. Deine Meldung hilft dabei, die Geruchsbelastung nachvollziehbar zu
          dokumentieren.
        </p>
      </div>

      <Card className="mt-6">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <Detail label="Stärke" value={`${report.severity} · ${report.severityLabel}`} />
          <Detail
            label="Zeit"
            value={report.time}
            icon={<Clock className="size-4" aria-hidden />}
          />
          <Detail
            label="Wind"
            value={report.wind?.label ?? "Wird ergänzt"}
            icon={<Wind className="size-4" aria-hidden />}
          />
          <Detail
            label="Regen"
            value={report.precipitationMm === null ? "Wird ergänzt" : report.rainLabel}
            icon={<CloudRain className="size-4" aria-hidden />}
          />
        </dl>

        {(report.street || report.district) && (
          <p className="mt-5 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">
            Zugeordnet:{" "}
            <span className="font-semibold text-ink">
              {[report.street, report.district].filter(Boolean).join(" · ")}
            </span>
            . Öffentlich erscheint die Straße ohne Hausnummer.
          </p>
        )}
      </Card>

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <ButtonLink href="/" size="lg" className="sm:flex-1">
          Zur aktuellen Lage
        </ButtonLink>
        <Button variant="secondary" size="lg" onClick={onNewReport} className="sm:flex-1">
          Weitere Meldung
        </Button>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-sm text-ink-soft">
        {icon && <span className="text-ink-faint">{icon}</span>}
        {label}
      </dt>
      <dd className="mt-1 text-[0.9375rem] font-bold text-ink">{value}</dd>
    </div>
  );
}
