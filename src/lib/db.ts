import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

import type {
  Duration,
  LocationInfo,
  OdorType,
  Report,
  ReportSource,
  ReportStatus,
  Severity,
  Situation,
  StreetStat,
  Weather,
} from "./types";

/* ------------------------------------------------------------------ */
/* Connection                                                          */
/* ------------------------------------------------------------------ */

/**
 * Vercel's Postgres integration injects `POSTGRES_URL`; a self-hosted setup
 * usually provides `DATABASE_URL`. Both are accepted so the same build runs
 * locally, on Vercel and anywhere else.
 */
function connectionString(): string {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim();

  if (!url) {
    throw new Error(
      "Keine Datenbankverbindung konfiguriert. Bitte DATABASE_URL oder POSTGRES_URL setzen.",
    );
  }
  return url;
}

/** Managed Postgres requires TLS; a local server usually does not offer it. */
function needsTls(url: string): boolean {
  if (/sslmode=(disable|allow)/.test(url)) return false;
  if (/sslmode=(require|verify-ca|verify-full)/.test(url)) return true;
  try {
    const host = new URL(url).hostname;
    return !["localhost", "127.0.0.1", "::1", ""].includes(host);
  } catch {
    return true;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __byeSchlachthofPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __byeSchlachthofSchema: Promise<void> | undefined;
}

function pool(): Pool {
  if (!globalThis.__byeSchlachthofPool) {
    const url = connectionString();
    globalThis.__byeSchlachthofPool = new Pool({
      connectionString: url,
      ssl: needsTls(url) ? { rejectUnauthorized: false } : undefined,
      // Serverless instances are short-lived and numerous — keep each one small.
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalThis.__byeSchlachthofPool;
}

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS reports (
    id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id           TEXT NOT NULL UNIQUE,
    reported_at         TIMESTAMPTZ NOT NULL,
    severity            SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    street              TEXT,
    house_number        TEXT,
    district            TEXT,
    postal_code         TEXT,
    city                TEXT,
    odor_type           TEXT,
    duration            TEXT,
    comment             TEXT,
    source              TEXT NOT NULL DEFAULT 'web',
    reporter_hash       TEXT,
    status              TEXT NOT NULL DEFAULT 'visible',
    weather_status      TEXT NOT NULL DEFAULT 'pending',
    wind_direction_deg  DOUBLE PRECISION,
    wind_speed_kmh      DOUBLE PRECISION,
    wind_gust_kmh       DOUBLE PRECISION,
    temperature_c       DOUBLE PRECISION,
    precipitation_mm    DOUBLE PRECISION,
    pressure_hpa        DOUBLE PRECISION,
    humidity_pct        DOUBLE PRECISION,
    weather_fetched_at  TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_reports_time     ON reports (reported_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reports_status   ON reports (status, reported_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports (reporter_hash, reported_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reports_street   ON reports (street) WHERE street IS NOT NULL;

  CREATE TABLE IF NOT EXISTS location_cache (
    cell         TEXT PRIMARY KEY,
    street       TEXT,
    house_number TEXT,
    district     TEXT,
    postal_code  TEXT,
    city         TEXT,
    source_lat   DOUBLE PRECISION,
    source_lon   DOUBLE PRECISION,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS idempotency_keys (
    key         TEXT PRIMARY KEY,
    report_id   INTEGER NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- CREATE TABLE IF NOT EXISTS leaves an existing table untouched, so columns
  -- added later need their own statement.
  ALTER TABLE reports        ADD COLUMN IF NOT EXISTS house_number TEXT;
  ALTER TABLE location_cache ADD COLUMN IF NOT EXISTS house_number TEXT;
  ALTER TABLE location_cache ADD COLUMN IF NOT EXISTS source_lat   DOUBLE PRECISION;
  ALTER TABLE location_cache ADD COLUMN IF NOT EXISTS source_lon   DOUBLE PRECISION;
`;

/** Runs once per process; later calls await the same promise. */
function ensureSchema(): Promise<void> {
  if (!globalThis.__byeSchlachthofSchema) {
    globalThis.__byeSchlachthofSchema = pool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((error) => {
        // Allow a retry on the next request instead of caching the failure.
        globalThis.__byeSchlachthofSchema = undefined;
        throw error;
      });
  }
  return globalThis.__byeSchlachthofSchema;
}

async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  await ensureSchema();
  return pool().query<T>(text, values);
}

/** Exposed for the health probe and one-off scripts. */
export async function withClient<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await pool().connect();
  try {
    return await run(client);
  } finally {
    client.release();
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function newPublicId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let id = "";
  for (const byte of bytes) id += ID_ALPHABET[byte % ID_ALPHABET.length];
  return id;
}

type Row = Record<string, unknown>;

/** `pg` returns TIMESTAMPTZ as Date and NUMERIC/BIGINT as string. */
function isoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toReport(row: Row): Report {
  return {
    id: Number(row.id),
    publicId: row.public_id as string,
    reportedAt: isoOrNull(row.reported_at)!,
    severity: Number(row.severity) as Severity,
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    street: (row.street as string) ?? null,
    houseNumber: (row.house_number as string) ?? null,
    district: (row.district as string) ?? null,
    postalCode: (row.postal_code as string) ?? null,
    city: (row.city as string) ?? null,
    odorType: (row.odor_type as OdorType) ?? null,
    duration: (row.duration as Duration) ?? null,
    comment: (row.comment as string) ?? null,
    source: row.source as ReportSource,
    status: row.status as ReportStatus,
    weatherStatus: row.weather_status as Report["weatherStatus"],
    windDirectionDeg: numberOrNull(row.wind_direction_deg),
    windSpeedKmh: numberOrNull(row.wind_speed_kmh),
    windGustKmh: numberOrNull(row.wind_gust_kmh),
    temperatureC: numberOrNull(row.temperature_c),
    precipitationMm: numberOrNull(row.precipitation_mm),
    pressureHpa: numberOrNull(row.pressure_hpa),
    humidityPct: numberOrNull(row.humidity_pct),
    weatherFetchedAt: isoOrNull(row.weather_fetched_at),
  };
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3600_000);
}

const REPORT_COLUMNS = `
  id, public_id, reported_at, severity, latitude, longitude,
  street, house_number, district, postal_code, city, odor_type, duration, comment,
  source, status, weather_status,
  wind_direction_deg, wind_speed_kmh, wind_gust_kmh,
  temperature_c, precipitation_mm, pressure_hpa, humidity_pct, weather_fetched_at
`;

/* ------------------------------------------------------------------ */
/* Writes                                                             */
/* ------------------------------------------------------------------ */

export interface NewReport {
  severity: Severity;
  reportedAt?: string;
  latitude: number | null;
  longitude: number | null;
  odorType: OdorType | null;
  duration: Duration | null;
  comment: string | null;
  source: ReportSource;
  reporterHash: string | null;
}

export async function createReport(input: NewReport): Promise<Report> {
  const result = await query<Row>(
    `INSERT INTO reports (
       public_id, reported_at, severity, latitude, longitude,
       odor_type, duration, comment, source, reporter_hash
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${REPORT_COLUMNS}`,
    [
      newPublicId(),
      input.reportedAt ?? new Date().toISOString(),
      input.severity,
      input.latitude,
      input.longitude,
      input.odorType,
      input.duration,
      input.comment,
      input.source,
      input.reporterHash,
    ],
  );
  return toReport(result.rows[0]);
}

export async function attachWeather(id: number, weather: Weather | null): Promise<void> {
  if (!weather) {
    await query(`UPDATE reports SET weather_status = 'failed' WHERE id = $1`, [id]);
    return;
  }

  await query(
    `UPDATE reports SET
       weather_status = 'ok',
       wind_direction_deg = $2,
       wind_speed_kmh = $3,
       wind_gust_kmh = $4,
       temperature_c = $5,
       precipitation_mm = $6,
       pressure_hpa = $7,
       humidity_pct = $8,
       weather_fetched_at = $9
     WHERE id = $1`,
    [
      id,
      weather.windDirectionDeg,
      weather.windSpeedKmh,
      weather.windGustKmh,
      weather.temperatureC,
      weather.precipitationMm,
      weather.pressureHpa,
      weather.humidityPct,
      weather.fetchedAt,
    ],
  );
}

export async function attachLocation(id: number, location: LocationInfo | null): Promise<void> {
  if (!location || (!location.street && !location.district)) return;

  await query(
    `UPDATE reports SET
       street = COALESCE($2, street),
       house_number = COALESCE($3, house_number),
       district = COALESCE($4, district),
       postal_code = COALESCE($5, postal_code),
       city = COALESCE($6, city)
     WHERE id = $1`,
    [
      id,
      location.street,
      location.houseNumber,
      location.district,
      location.postalCode,
      location.city,
    ],
  );
}

export async function setReportStatus(id: number, status: ReportStatus): Promise<void> {
  await query(`UPDATE reports SET status = $2 WHERE id = $1`, [id, status]);
}

export async function deleteReport(id: number): Promise<void> {
  await query(`DELETE FROM reports WHERE id = $1`, [id]);
}

/* ------------------------------------------------------------------ */
/* Location cache                                                      */
/* ------------------------------------------------------------------ */

/**
 * A cache cell spans roughly eleven metres, which is fine for a street but can
 * straddle two buildings. Reusing a cached house number beyond this distance
 * would put a report on the neighbour's doorstep, so it is dropped instead.
 */
const HOUSE_NUMBER_REUSE_METRES = 8;

function metresApart(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const latMetres = (lat1 - lat2) * 111_320;
  const lonMetres = (lon1 - lon2) * 111_320 * Math.cos((lat1 * Math.PI) / 180);
  return Math.hypot(latMetres, lonMetres);
}

export async function cachedLocation(
  cell: string,
  latitude: number,
  longitude: number,
): Promise<LocationInfo | null> {
  const result = await query<Row>(
    `SELECT street, house_number, district, postal_code, city, source_lat, source_lon
       FROM location_cache WHERE cell = $1`,
    [cell],
  );
  const row = result.rows[0];
  if (!row) return null;

  const sourceLat = numberOrNull(row.source_lat);
  const sourceLon = numberOrNull(row.source_lon);
  const sameSpot =
    sourceLat !== null &&
    sourceLon !== null &&
    metresApart(latitude, longitude, sourceLat, sourceLon) <= HOUSE_NUMBER_REUSE_METRES;

  return {
    street: (row.street as string) ?? null,
    houseNumber: sameSpot ? ((row.house_number as string) ?? null) : null,
    district: (row.district as string) ?? null,
    postalCode: (row.postal_code as string) ?? null,
    city: (row.city as string) ?? null,
  };
}

export async function cacheLocation(
  cell: string,
  location: LocationInfo,
  latitude: number,
  longitude: number,
): Promise<void> {
  await query(
    `INSERT INTO location_cache
       (cell, street, house_number, district, postal_code, city, source_lat, source_lon)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (cell) DO UPDATE SET
       street = EXCLUDED.street,
       house_number = EXCLUDED.house_number,
       district = EXCLUDED.district,
       postal_code = EXCLUDED.postal_code,
       city = EXCLUDED.city,
       source_lat = EXCLUDED.source_lat,
       source_lon = EXCLUDED.source_lon`,
    [
      cell,
      location.street,
      location.houseNumber,
      location.district,
      location.postalCode,
      location.city,
      latitude,
      longitude,
    ],
  );
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export async function reportById(id: number): Promise<Report | null> {
  const result = await query<Row>(`SELECT ${REPORT_COLUMNS} FROM reports WHERE id = $1`, [id]);
  return result.rows[0] ? toReport(result.rows[0]) : null;
}

export async function reportByPublicId(publicId: string): Promise<Report | null> {
  const result = await query<Row>(`SELECT ${REPORT_COLUMNS} FROM reports WHERE public_id = $1`, [
    publicId,
  ]);
  return result.rows[0] ? toReport(result.rows[0]) : null;
}

export async function recentReports(limit = 20): Promise<Report[]> {
  const result = await query<Row>(
    `SELECT ${REPORT_COLUMNS} FROM reports
     WHERE status = 'visible'
     ORDER BY reported_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows.map(toReport);
}

/** Visible reports from the last N hours, newest first. */
export async function recentReportsSince(hours: number, limit: number): Promise<Report[]> {
  const result = await query<Row>(
    `SELECT ${REPORT_COLUMNS} FROM reports
     WHERE status = 'visible' AND reported_at >= $1
     ORDER BY reported_at DESC
     LIMIT $2`,
    [hoursAgo(hours), limit],
  );
  return result.rows.map(toReport);
}

export async function allReportsForAdmin(limit = 200, offset = 0): Promise<Report[]> {
  const result = await query<Row>(
    `SELECT ${REPORT_COLUMNS} FROM reports ORDER BY reported_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return result.rows.map(toReport);
}

export async function totalReportCount(): Promise<number> {
  const result = await query<Row>(`SELECT COUNT(*) AS n FROM reports`);
  return Number(result.rows[0].n);
}

export async function hiddenReportCount(): Promise<number> {
  const result = await query<Row>(`SELECT COUNT(*) AS n FROM reports WHERE status = 'hidden'`);
  return Number(result.rows[0].n);
}

export async function currentSituation(): Promise<Situation> {
  // One round trip instead of six — matters on serverless.
  const result = await query<Row>(
    `WITH windows AS (
       SELECT
         COUNT(*) FILTER (WHERE reported_at >= $1) AS count_2h,
         AVG(severity) FILTER (WHERE reported_at >= $1) AS avg_2h,
         MAX(severity) FILTER (WHERE reported_at >= $1) AS max_2h,
         COUNT(*) FILTER (WHERE reported_at >= $2) AS count_24h,
         AVG(severity) FILTER (WHERE reported_at >= $2) AS avg_24h,
         COUNT(*) FILTER (WHERE reported_at >= $3) AS count_7d
       FROM reports
       WHERE status = 'visible' AND reported_at >= $3
     ),
     latest AS (
       SELECT reported_at FROM reports
       WHERE status = 'visible' ORDER BY reported_at DESC LIMIT 1
     ),
     weather AS (
       SELECT wind_direction_deg, wind_speed_kmh, precipitation_mm, temperature_c
       FROM reports
       WHERE weather_status = 'ok' AND reported_at >= $4
       ORDER BY reported_at DESC LIMIT 1
     )
     SELECT
       windows.*,
       (SELECT reported_at FROM latest) AS last_report_at,
       (SELECT wind_direction_deg FROM weather) AS w_dir,
       (SELECT wind_speed_kmh FROM weather) AS w_speed,
       (SELECT precipitation_mm FROM weather) AS w_precip,
       (SELECT temperature_c FROM weather) AS w_temp,
       (SELECT COUNT(*) FROM weather) AS w_present
     FROM windows`,
    [hoursAgo(2), hoursAgo(24), hoursAgo(24 * 7), hoursAgo(3)],
  );

  const row = result.rows[0];

  const streets = await query<Row>(
    `SELECT street FROM reports
     WHERE status = 'visible' AND reported_at >= $1 AND street IS NOT NULL
     GROUP BY street
     ORDER BY COUNT(*) DESC
     LIMIT 5`,
    [hoursAgo(6)],
  );

  return {
    reports2h: Number(row.count_2h),
    reports24h: Number(row.count_24h),
    reports7d: Number(row.count_7d),
    averageSeverity2h: numberOrNull(row.avg_2h),
    averageSeverity24h: numberOrNull(row.avg_24h),
    maxSeverity2h: (numberOrNull(row.max_2h) as Severity) ?? null,
    lastReportAt: isoOrNull(row.last_report_at),
    activeStreets: streets.rows.map((entry) => entry.street as string),
    weather:
      Number(row.w_present) > 0
        ? {
            windDirectionDeg: numberOrNull(row.w_dir),
            windSpeedKmh: numberOrNull(row.w_speed),
            precipitationMm: numberOrNull(row.w_precip),
            temperatureC: numberOrNull(row.w_temp),
          }
        : null,
  };
}

export async function streetStats(since: string | Date, limit = 8): Promise<StreetStat[]> {
  const result = await query<Row>(
    `SELECT street,
            COUNT(*) AS count,
            AVG(severity) AS average,
            MAX(reported_at) AS latest
     FROM reports
     WHERE status = 'visible' AND reported_at >= $1 AND street IS NOT NULL
     GROUP BY street
     ORDER BY COUNT(*) DESC, MAX(reported_at) DESC
     LIMIT $2`,
    [since, limit],
  );

  return result.rows.map((row) => ({
    street: row.street as string,
    count: Number(row.count),
    averageSeverity: Number(row.average),
    lastReportAt: isoOrNull(row.latest)!,
  }));
}

/** Number of reports from the same sender inside the given window. */
export async function reportCountFromReporter(
  reporterHash: string,
  minutes: number,
): Promise<number> {
  const result = await query<Row>(
    `SELECT COUNT(*) AS n FROM reports WHERE reporter_hash = $1 AND reported_at >= $2`,
    [reporterHash, new Date(Date.now() - minutes * 60_000)],
  );
  return Number(result.rows[0].n);
}

/* ------------------------------------------------------------------ */
/* Idempotency                                                         */
/* ------------------------------------------------------------------ */

/**
 * Repeated requests carrying the same key must not create a second report —
 * important when a shortcut retries on a flaky connection.
 */
export async function reportForIdempotencyKey(key: string): Promise<Report | null> {
  const result = await query<Row>(
    `SELECT ${REPORT_COLUMNS.split(",").map((c) => `r.${c.trim()}`).join(", ")}
     FROM idempotency_keys k JOIN reports r ON r.id = k.report_id
     WHERE k.key = $1`,
    [key],
  );
  return result.rows[0] ? toReport(result.rows[0]) : null;
}

export async function rememberIdempotencyKey(key: string, reportId: number): Promise<void> {
  await query(
    `INSERT INTO idempotency_keys (key, report_id) VALUES ($1, $2)
     ON CONFLICT (key) DO NOTHING`,
    [key, reportId],
  );
}
