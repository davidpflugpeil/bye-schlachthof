import type { Metadata } from "next";
import { BarChart3, Info, Wind } from "lucide-react";

import { isSignedIn } from "@/lib/admin-auth";
import {
  CALM_BELOW_KMH,
  DOWNWIND_HALF_ANGLE,
  MAP_FIELD_METRES,
  MIN_REPORTS_PER_FIELD,
  NEAR_SITE_METRES,
  RANGES,
  formatFullDay,
  parseRange,
  percent,
  type Analytics,
} from "@/lib/analytics";
import { loadAnalytics } from "@/lib/analytics-data";
import { formatNumber, reportNoun } from "@/lib/format";
import { AnalyticsShell } from "@/components/analytics/analytics-shell";
import { AdminInsights } from "@/components/analytics/admin-insights";
import { ChartCard } from "@/components/analytics/chart-card";
import { DownwindCard } from "@/components/analytics/downwind-card";
import { NeighbourhoodMap } from "@/components/analytics/neighbourhood-map";
import { SeverityChart, SeverityTable } from "@/components/analytics/severity-chart";
import { Takeaways } from "@/components/analytics/takeaways";
import {
  HeatLegend,
  TimeOfDayChart,
  TimeOfDayTable,
} from "@/components/analytics/time-of-day-chart";
import {
  TimelineChart,
  TimelineLegend,
  TimelineTable,
} from "@/components/analytics/timeline-chart";
import { WindLegend, WindRose, WindRoseTable } from "@/components/analytics/wind-rose";
import { StreetRanking } from "@/components/street-ranking";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Auswertung",
  description:
    "Wann es in der Nachbarschaft riecht, wie stark und bei welchem Wind – ausgewertet aus allen Meldungen.",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ zeitraum?: string | string[] }>;
}) {
  const { zeitraum } = await searchParams;
  const range = parseRange(zeitraum);
  const admin = await isSignedIn();
  const data = await loadAnalytics(range, { admin });
  const { period } = data;

  const defaultKey = parseRange(undefined).key;
  const periods = RANGES.map((option) => ({
    key: option.key,
    label: option.label,
    href: option.key === defaultKey ? "/auswertung" : `/auswertung?zeitraum=${option.key}`,
  }));

  return (
    <div className="page-shell py-6 sm:py-10">
      <div className="max-w-2xl">
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.022em] text-ink sm:text-[2.25rem]">
          Auswertung
        </h1>
        <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink-soft sm:text-lg">
          Wann es riecht, wie stark und bei welchem Wind – das Muster aus den Meldungen der
          Nachbarschaft.
        </p>
      </div>

      <AnalyticsShell
        periods={periods}
        active={range.key}
        summary={`${formatFullDay(period.startDay)} – ${formatFullDay(period.endDay)}`}
      >
        {data.total === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<BarChart3 className="size-5" aria-hidden />}
            title="In diesem Zeitraum liegen keine Meldungen vor."
            text="Wähle einen längeren Zeitraum – oder halte fest, was du gerade wahrnimmst."
            action={
              <ButtonLink href="/melden" size="md">
                <Wind className="size-4" aria-hidden />
                Geruch melden
              </ButtonLink>
            }
          />
        ) : (
          <AnalyticsContent data={data} />
        )}
      </AnalyticsShell>
    </div>
  );
}

function AnalyticsContent({ data }: { data: Analytics }) {
  const { period, wind } = data;
  const days = period.range.days;
  const baseline = wind.baselineHours !== null;

  return (
    <>
      <Takeaways takeaways={data.takeaways} />

      <ChartCard
        id="uhrzeit"
        className="mt-4"
        title="Wann es riecht"
        description="Oben alle Meldungen je Uhrzeit, darunter aufgeteilt nach Wochentag – je dunkler ein Feld, desto mehr Meldungen."
        legend={<HeatLegend maximum={Math.max(1, ...data.grid.flat())} />}
        footnote="Nachts wird naturgemäß seltener gemeldet – eine leere Stunde heißt nicht, dass es nicht gerochen hat."
        table={<TimeOfDayTable hours={data.hours} grid={data.grid} />}
      >
        <TimeOfDayChart hours={data.hours} grid={data.grid} weekdays={data.weekdays} />
      </ChartCard>

      <NeighbourhoodMap map={data.map} className="mt-4" />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          id="windrose"
          title="Woher der Wind kam"
          description={
            baseline
              ? "Ein Blatt zeigt, woher der Wind bei den Meldungen kam. Die Linie zeigt, wie oft er im selben Zeitraum ohnehin aus dieser Richtung wehte."
              : "Ein Blatt zeigt, woher der Wind bei den Meldungen kam – je länger, desto häufiger."
          }
          legend={<WindLegend baseline={baseline} />}
          footnote={[
            wind.calm > 0
              ? `${wind.calm} ${reportNoun(wind.calm)} bei Windstille (unter ${CALM_BELOW_KMH} km/h) sind nicht enthalten.`
              : null,
            baseline ? null : "Die Vergleichswerte für alle Stunden sind gerade nicht abrufbar.",
          ]
            .filter(Boolean)
            .join(" ") || undefined}
          table={<WindRoseTable sectors={wind.sectors} />}
        >
          {wind.withDirection === 0 ? (
            <p className="text-[0.9375rem] text-ink-soft">
              Für diesen Zeitraum liegen keine Winddaten vor.
            </p>
          ) : (
            <WindRose sectors={wind.sectors} />
          )}
        </ChartCard>

        <DownwindCard downwind={wind.downwind} speeds={wind.speeds} />
      </div>

      <ChartCard
        id="verlauf"
        className="mt-4"
        title="Verlauf"
        description={
          period.granularity === "week"
            ? "Meldungen pro Kalenderwoche. Unten die starken, darüber die übrigen."
            : "Meldungen pro Tag. Unten die starken, darüber die übrigen."
        }
        legend={<TimelineLegend />}
        table={<TimelineTable buckets={data.timeline} />}
      >
        <TimelineChart buckets={data.timeline} />
      </ChartCard>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:items-start">
        <ChartCard
          id="staerke"
          title="Wie stark es riecht"
          description={
            <>
              Ø{"\u00a0"}Stärke{" "}
              <strong className="font-semibold text-ink">
                {formatNumber(data.averageSeverity, 1)}
              </strong>{" "}
              – {percent(data.strong / data.total)} der Meldungen waren stark oder extrem.
            </>
          }
          table={<SeverityTable severities={data.severities} total={data.total} />}
        >
          <SeverityChart severities={data.severities} total={data.total} />
        </ChartCard>

        <StreetRanking
          streets={data.streets}
          period={days ? `Letzte ${days} Tage` : "Seit Projektstart"}
        />
      </div>

      {data.admin && <AdminInsights insights={data.admin} total={data.total} />}

      <MethodNote />
    </>
  );
}

function MethodNote() {
  return (
    <Card tone="muted" shadow="none" className="mt-10">
      <h2 className="inline-flex items-center gap-2 text-base font-bold text-ink">
        <Info className="size-4 text-ink-faint" aria-hidden />
        So wird gerechnet
      </h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft marker:text-ink-faint">
        <li>
          Gezählt werden alle sichtbaren Meldungen im gewählten Zeitraum. Uhrzeiten und Tage
          beziehen sich auf Münchner Zeit.
        </li>
        <li>
          Wind und Wetter stammen von Open-Meteo und gelten für den Zeitpunkt der jeweiligen
          Meldung.
        </li>
        <li>
          „Wind vom Schlachthof“ heißt: Von der Meldung aus gesehen kam der Wind aus der Richtung
          des Schlachthofs an der Zenettistraße 10, mit höchstens {DOWNWIND_HALF_ANGLE}°
          Abweichung. Meldungen bei Windstille oder näher als {NEAR_SITE_METRES} m am Gelände
          zählen dabei nicht mit.
        </li>
        <li>
          Der Vergleichswert „alle Stunden“ zeigt, wie oft der Wind im selben Zeitraum ohnehin so
          wehte. Liegt der Anteil bei den Meldungen deutlich darüber, spricht das dafür, dass der
          Geruch mit dem Wind vom Schlachthof kommt – und nicht bloß dafür, dass in München oft
          Westwind weht. „Deutlich“ heißt: Der Unterschied ist größer, als der Zufall bei dieser
          Zahl an Meldungen erklären würde.
        </li>
        <li>
          Genaue Standorte dienen nur der Windberechnung und der Karte und werden nie angezeigt.
          Die Karte fasst Meldungen zu Feldern von {MAP_FIELD_METRES} × {MAP_FIELD_METRES} m
          zusammen; ein Feld erscheint erst ab {MIN_REPORTS_PER_FIELD} Meldungen. Hausnummern
          spielen für die Auswertung keine Rolle. Kartengrundlage: © OpenStreetMap-Mitwirkende.
        </li>
      </ul>
    </Card>
  );
}
