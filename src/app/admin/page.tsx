import type { Metadata } from "next";
import Link from "next/link";
import { Download, LogOut } from "lucide-react";

import { isSignedIn, adminEnabled } from "@/lib/admin-auth";
import { signOut } from "./actions";
import {
  allReportsForAdmin,
  clientCount,
  currentSituation,
  hiddenReportCount,
  listClients,
  pendingReportCount,
  totalReportCount,
} from "@/lib/db";
import { surgeState } from "@/lib/surge";
import { formatNumber } from "@/lib/format";
import { LoginForm } from "@/components/admin/login-form";
import { ClientList } from "@/components/admin/client-list";
import { ReportList } from "@/components/admin/report-list";
import { StatCard } from "@/components/ui/stat-card";
import { Button, buttonClasses } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verwaltung",
  robots: { index: false, follow: false },
};

export default async function AdminSeite() {
  if (!adminEnabled()) {
    return (
      <div className="page-shell flex min-h-[60vh] items-center justify-center py-10">
        <div className="max-w-md rounded-xl border border-sand bg-sand-soft p-6 text-center">
          <h1 className="text-xl font-bold text-ink">Verwaltung nicht eingerichtet</h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
            Setze die Umgebungsvariable <code className="text-ink">ADMIN_PASSWORD</code>, um den
            Verwaltungsbereich zu aktivieren.
          </p>
        </div>
      </div>
    );
  }

  if (!(await isSignedIn())) {
    return (
      <div className="page-shell flex min-h-[70vh] items-center justify-center py-10">
        <LoginForm />
      </div>
    );
  }

  const reports = allReportsForAdmin(150);
  const total = totalReportCount();
  const situation = currentSituation();
  const hiddenCount = hiddenReportCount();
  const pendingCount = pendingReportCount();
  const clients = listClients(100);
  const devices = clientCount();
  const surge = surgeState();

  return (
    <div className="page-shell py-6 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.022em] text-ink sm:text-[2rem]">
            Verwaltung
          </h1>
          <p className="mt-1.5 text-[0.9375rem] text-ink-soft">
            Meldungen prüfen, verbergen oder löschen.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link href="/admin/export" className={buttonClasses({ variant: "secondary", size: "md" })}>
            <Download className="size-4" aria-hidden />
            CSV herunterladen
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="md">
              <LogOut className="size-4" aria-hidden />
              Abmelden
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
        <StatCard label="Meldungen gesamt" value={total} />
        <StatCard label="Letzte 24 Stunden" value={situation.reports24h} />
        <StatCard
          label="Ø Stärke (24 Std.)"
          value={formatNumber(situation.averageSeverity24h, 1)}
        />
        <StatCard label="In Prüfung" value={pendingCount} />
        <StatCard label="Verborgen" value={hiddenCount} />
        <StatCard label="Geräte" value={devices} />
      </div>

      {/* Only shown when it matters — otherwise the brake needs no attention. */}
      {surge.active && (
        <div className="mt-5 rounded-xl border border-sand bg-sand-soft p-4 sm:p-5">
          <h2 className="text-base font-bold text-ink">Ungewöhnlich viele Meldungen</h2>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
            In der letzten Stunde sind {surge.lastHour} Meldungen eingegangen; üblich sind{" "}
            {formatNumber(surge.baseline, 1)} pro Stunde. Ab {surge.threshold} greift die Bremse:
            Meldungen von Geräten ohne Vorgeschichte landen vorerst in der Prüfung statt direkt auf
            der Seite.
          </p>
        </div>
      )}

      <section aria-labelledby="liste" className="mt-8">
        <h2 id="liste" className="text-lg font-bold text-ink">
          Letzte {reports.length} Meldungen
        </h2>
        <div className="mt-3">
          <ReportList reports={reports} />
        </div>
      </section>

      <section aria-labelledby="geraete" className="mt-10">
        <h2 id="geraete" className="text-lg font-bold text-ink">
          Freigeschaltete Geräte
        </h2>
        <p className="mt-1 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
          Anonyme Token ohne Personenbezug. Ein gesperrtes Gerät kann nichts mehr melden — alle
          anderen bleiben unberührt.
        </p>
        <div className="mt-3">
          <ClientList clients={clients} />
        </div>
      </section>
    </div>
  );
}
