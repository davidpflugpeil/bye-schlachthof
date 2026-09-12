"use client";

import * as React from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";

import { removeReport, toggleVisibility } from "@/app/admin/actions";
import { cn } from "@/lib/cn";
import {
  durationLabel,
  formatDate,
  formatNumber,
  formatTime,
  odorTypeLabel,
  severityColors,
  severityLabel,
  windLabel,
} from "@/lib/format";
import type { Report, ReportStatus } from "@/lib/types";
import { Button, IconButton } from "@/components/ui/button";
import { Modal } from "@/components/ui/sheet";

/** Anything not on the site says why: hidden by hand, or held by the brake. */
function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={cn("text-sm font-semibold", status === "pending" ? "text-warn" : "text-danger")}
    >
      {status === "pending" ? "in Prüfung" : "verborgen"}
    </span>
  );
}

export function ReportList({ reports }: { reports: Report[] }) {
  const [pending, startTransition] = React.useTransition();
  const [pendingDeletion, setPendingDeletion] = React.useState<Report | null>(null);

  function toggle(report: Report) {
    startTransition(async () => {
      await toggleVisibility(report.id, report.status === "visible");
    });
  }

  function confirmDeletion() {
    if (!pendingDeletion) return;
    const id = pendingDeletion.id;
    setPendingDeletion(null);
    startTransition(async () => {
      await removeReport(id);
    });
  }

  if (reports.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong bg-surface-muted px-5 py-10 text-center text-[0.9375rem] text-ink-soft">
        Es liegen noch keine Meldungen vor.
      </p>
    );
  }

  return (
    <>
      {/* Table from tablet width up */}
      <div
        className={cn(
          "hidden overflow-hidden rounded-xl border border-line bg-surface md:block",
          pending && "opacity-70",
        )}
      >
        <table className="w-full text-left text-[0.9375rem]">
          <thead className="border-b border-line bg-surface-muted text-sm text-ink-soft">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Zeitpunkt
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Stärke
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Ort
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Wetter
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Quelle
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {reports.map((report) => {
              const colors = severityColors(report.severity);
              const published = report.status === "visible";
              return (
                <tr key={report.id} className={cn(!published && "bg-surface-sunken/60")}>
                  <td className="px-4 py-3 align-top">
                    <span className="block font-medium text-ink tabular-nums">
                      {formatTime(report.reportedAt)}
                    </span>
                    <span className="block text-sm text-ink-soft tabular-nums">
                      {formatDate(report.reportedAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex size-6 items-center justify-center rounded-full text-[0.8125rem] font-bold text-white tabular-nums",
                          colors.fill,
                        )}
                      >
                        {report.severity}
                      </span>
                      <span className="text-ink">{severityLabel(report.severity)}</span>
                    </span>
                    {(report.odorType || report.duration) && (
                      <span className="mt-1 block text-sm text-ink-soft">
                        {[odorTypeLabel(report.odorType), durationLabel(report.duration)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="block text-ink">{report.street ?? "–"}</span>
                    <span className="block text-sm text-ink-soft">
                      {[report.postalCode, report.district].filter(Boolean).join(" ") || "–"}
                    </span>
                    {report.latitude !== null && (
                      <span className="block text-sm text-ink-faint tabular-nums">
                        {report.latitude.toFixed(4)}, {report.longitude?.toFixed(4)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-ink-soft">
                    {windLabel(report.windDirectionDeg, report.windSpeedKmh, "short") ?? "–"}
                    {report.precipitationMm !== null && (
                      <span className="block text-sm">
                        {formatNumber(report.precipitationMm, 1)} mm
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-sm text-ink-soft">
                      {report.source === "shortcut" ? "Kurzbefehl" : "Website"}
                    </span>
                    {!published && (
                      <span className="mt-1 block">
                        <StatusBadge status={report.status} />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <span className="inline-flex gap-1.5">
                      <IconButton
                        label={published ? "Verbergen" : "Veröffentlichen"}
                        variant="ghost"
                        size="sm"
                        onClick={() => toggle(report)}
                      >
                        {published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </IconButton>
                      <IconButton
                        label="Löschen"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDeletion(report)}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards on phones */}
      <div className={cn("space-y-2.5 md:hidden", pending && "opacity-70")}>
        {reports.map((report) => {
          const colors = severityColors(report.severity);
          const published = report.status === "visible";
          return (
            <div
              key={report.id}
              className={cn(
                "rounded-lg border border-line bg-surface p-4 shadow-soft",
                !published && "bg-surface-sunken/70",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-[0.8125rem] font-bold text-white tabular-nums",
                        colors.fill,
                      )}
                    >
                      {report.severity}
                    </span>
                    <span className="font-semibold text-ink">
                      {severityLabel(report.severity)}
                    </span>
                  </span>
                  <p className="mt-1 text-sm text-ink-soft tabular-nums">
                    {formatDate(report.reportedAt)} · {formatTime(report.reportedAt)}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {[report.street, report.district].filter(Boolean).join(" · ") ||
                      "Ort unbekannt"}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {report.source === "shortcut" ? "Kurzbefehl" : "Website"}
                  </p>
                  {!published && (
                    <p className="mt-1">
                      <StatusBadge status={report.status} />
                    </p>
                  )}
                </div>
                <span className="flex shrink-0 gap-1.5">
                  <IconButton
                    label={published ? "Verbergen" : "Veröffentlichen"}
                    variant="ghost"
                    size="sm"
                    onClick={() => toggle(report)}
                  >
                    {published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </IconButton>
                  <IconButton
                    label="Löschen"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDeletion(report)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </span>
              </div>

              {report.comment && (
                <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-ink-soft">
                  „{report.comment}“
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        open={pendingDeletion !== null}
        onClose={() => setPendingDeletion(null)}
        title="Meldung endgültig löschen?"
        description="Die Meldung wird unwiderruflich aus der Datenbank entfernt. Alternativ kannst du sie nur verbergen."
      >
        <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
          <Button variant="danger" size="lg" onClick={confirmDeletion} className="sm:flex-1">
            Endgültig löschen
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setPendingDeletion(null)}
            className="sm:flex-1"
          >
            Abbrechen
          </Button>
        </div>
      </Modal>
    </>
  );
}
