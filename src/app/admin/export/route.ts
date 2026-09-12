import { isSignedIn } from "@/lib/admin-auth";
import { allReportsForAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "id",
  "reported_at",
  "severity",
  "street",
  "district",
  "postal_code",
  "city",
  "latitude",
  "longitude",
  "odor_type",
  "duration",
  "comment",
  "source",
  "status",
  "wind_direction_deg",
  "wind_speed_kmh",
  "wind_gust_kmh",
  "temperature_c",
  "precipitation_mm",
  "pressure_hpa",
  "humidity_pct",
];

function field(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV export of every report — only for signed-in maintainers. */
export async function GET() {
  if (!(await isSignedIn())) {
    return new Response("Nicht angemeldet.", { status: 401 });
  }

  const reports = allReportsForAdmin(100_000);

  const lines = [
    COLUMNS.join(";"),
    ...reports.map((m) =>
      [
        m.publicId,
        m.reportedAt,
        m.severity,
        m.street,
        m.district,
        m.postalCode,
        m.city,
        m.latitude,
        m.longitude,
        m.odorType,
        m.duration,
        m.comment,
        m.source,
        m.status,
        m.windDirectionDeg,
        m.windSpeedKmh,
        m.windGustKmh,
        m.temperatureC,
        m.precipitationMm,
        m.pressureHpa,
        m.humidityPct,
      ]
        .map(field)
        .join(";"),
    ),
  ];

  const today = new Date().toISOString().slice(0, 10);

  // Byte order mark so spreadsheet apps detect the umlauts correctly.
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="geruchsmeldungen-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
