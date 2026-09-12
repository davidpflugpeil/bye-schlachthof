"use client";

import * as React from "react";
import { Ban, RotateCcw } from "lucide-react";

import { restoreClient, revokeClient } from "@/app/admin/actions";
import { cn } from "@/lib/cn";
import { formatDate, formatTime } from "@/lib/format";
import type { ReportingClient } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/sheet";

/**
 * The enrolled devices.
 *
 * There is nothing here that identifies a person — a device shows up as the
 * day it was enrolled and the number of reports behind it. What it is for is
 * the one thing the shared token never allowed: locking out a single sender
 * without touching anybody else.
 */
export function ClientList({ clients }: { clients: ReportingClient[] }) {
  const [busy, startTransition] = React.useTransition();
  const [candidate, setCandidate] = React.useState<ReportingClient | null>(null);

  function revoke(withReports: boolean) {
    if (!candidate) return;
    const id = candidate.id;
    setCandidate(null);
    startTransition(async () => {
      await revokeClient(id, withReports);
    });
  }

  if (clients.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong bg-surface-muted px-5 py-10 text-center text-[0.9375rem] text-ink-soft">
        Es wurde noch kein Gerät freigeschaltet.
      </p>
    );
  }

  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-line bg-surface",
          busy && "opacity-70",
        )}
      >
        <table className="w-full text-left text-[0.9375rem]">
          <thead className="border-b border-line bg-surface-muted text-sm text-ink-soft">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Gerät
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Art
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Meldungen
              </th>
              <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">
                Zuletzt
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {clients.map((client) => {
              const revoked = client.status === "revoked";
              return (
                <tr key={client.id} className={cn(revoked && "bg-surface-sunken/60")}>
                  <td className="px-4 py-3 align-top">
                    <code className="text-sm text-ink">{client.publicId}</code>
                    <span className="block text-sm text-ink-soft tabular-nums">
                      seit {formatDate(isoFrom(client.createdAt))}
                    </span>
                    {revoked && (
                      <span className="mt-1 block text-sm font-semibold text-danger">gesperrt</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-ink-soft">
                    {client.kind === "shortcut" ? "Kurzbefehl" : "Website"}
                  </td>
                  <td className="px-4 py-3 align-top text-ink tabular-nums">
                    {client.reportCount}
                  </td>
                  <td className="hidden px-4 py-3 align-top text-sm text-ink-soft tabular-nums sm:table-cell">
                    {client.lastSeenAt
                      ? `${formatDate(isoFrom(client.lastSeenAt))} · ${formatTime(isoFrom(client.lastSeenAt))}`
                      : "–"}
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    {revoked ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          startTransition(async () => {
                            await restoreClient(client.id);
                          })
                        }
                      >
                        <RotateCcw className="size-4" aria-hidden />
                        Entsperren
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setCandidate(client)}>
                        <Ban className="size-4" aria-hidden />
                        Sperren
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={candidate !== null}
        onClose={() => setCandidate(null)}
        title="Gerät sperren?"
        description="Das Gerät kann danach nichts mehr melden. Du kannst zusätzlich alle bisherigen Meldungen dieses Geräts verbergen — sie bleiben gespeichert, erscheinen aber nicht mehr öffentlich."
      >
        <div className="flex flex-col gap-2.5">
          <Button variant="danger" size="lg" onClick={() => revoke(true)}>
            Sperren und Meldungen verbergen
          </Button>
          <Button variant="secondary" size="lg" onClick={() => revoke(false)}>
            Nur sperren
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setCandidate(null)}>
            Abbrechen
          </Button>
        </div>
      </Modal>
    </>
  );
}

/** SQLite writes "YYYY-MM-DD HH:MM:SS" in UTC; the formatters expect ISO. */
function isoFrom(value: string): string {
  return value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
}
