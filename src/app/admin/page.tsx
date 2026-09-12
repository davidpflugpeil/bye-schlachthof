import type { Metadata } from "next";
import Link from "next/link";
import { Download, LogOut } from "lucide-react";

import { isSignedIn, adminEnabled } from "@/lib/admin-auth";
import { signOut } from "./actions";
import {
  allReportsForAdmin,
  currentSituation,
  hiddenReportCount,
  totalReportCount,
} from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { LoginForm } from "@/components/admin/login-form";
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

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Meldungen gesamt" value={total} />
        <StatCard label="Letzte 24 Stunden" value={situation.reports24h} />
        <StatCard
          label="Ø Stärke (24 Std.)"
          value={formatNumber(situation.averageSeverity24h, 1)}
        />
        <StatCard label="Verborgen" value={hiddenCount} />
      </div>

      <section aria-labelledby="liste" className="mt-8">
        <h2 id="liste" className="text-lg font-bold text-ink">
          Letzte {reports.length} Meldungen
        </h2>
        <div className="mt-3">
          <ReportList reports={reports} />
        </div>
      </section>
    </div>
  );
}
