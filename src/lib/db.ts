import "server-only";

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import type {
  ClientKind,
  ClientStatus,
  Duration,
  LocationInfo,
  OdorType,
  Report,
  ReportingClient,
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

const DEFAULT_PATH = path.join(process.cwd(), "data", "bye-schlachthof.db");
/** File name used before the codebase was renamed to English. */
const LEGACY_PATH = path.join(process.cwd(), "data", "geruchsmelder.db");

function openConnection(): Database.Database {
  const file = process.env.DATABASE_PATH?.trim() || DEFAULT_PATH;
  fs.mkdirSync(path.dirname(file), { recursive: true });

  // One-time move of the previously named file, so existing data is kept.
  if (file === DEFAULT_PATH && !fs.existsSync(file) && fs.existsSync(LEGACY_PATH)) {
    for (const suffix of ["", "-wal", "-shm"]) {
      if (fs.existsSync(`${LEGACY_PATH}${suffix}`)) {
        fs.renameSync(`${LEGACY_PATH}${suffix}`, `${file}${suffix}`);
      }
    }
  }

  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  createSchema(db);
  migrateFromGermanSchema(db);
  return db;
}

function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id           TEXT NOT NULL UNIQUE,
      reported_at         TEXT NOT NULL,
      severity            INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
      latitude            REAL,
      longitude           REAL,
      street              TEXT,
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
      wind_direction_deg  REAL,
      wind_speed_kmh      REAL,
      wind_gust_kmh       REAL,
      temperature_c       REAL,
      precipitation_mm    REAL,
      pressure_hpa        REAL,
      humidity_pct        REAL,
      weather_fetched_at  TEXT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_reports_time     ON reports (reported_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_status   ON reports (status, reported_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports (reporter_hash, reported_at DESC);

    CREATE TABLE IF NOT EXISTS location_cache (
      cell         TEXT PRIMARY KEY,
      street       TEXT,
      district     TEXT,
      postal_code  TEXT,
      city         TEXT,
      created_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key         TEXT PRIMARY KEY,
      report_id   INTEGER NOT NULL,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id      TEXT NOT NULL UNIQUE,
      secret_hash    TEXT NOT NULL,
      kind           TEXT NOT NULL DEFAULT 'web',
      status         TEXT NOT NULL DEFAULT 'active',
      reporter_hash  TEXT,
      report_count   INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL,
      last_seen_at   TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_clients_status   ON clients (status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_clients_reporter ON clients (reporter_hash, created_at DESC);

    -- A solved challenge may mint exactly one token; the row expires with it.
    CREATE TABLE IF NOT EXISTS used_challenges (
      signature   TEXT PRIMARY KEY,
      expires_at  TEXT NOT NULL
    );
  `);

  // Existing databases predate the column — CREATE TABLE IF NOT EXISTS would
  // not add it.
  addColumn(db, "reports", "client_id", "INTEGER");
  db.exec(`CREATE INDEX IF NOT EXISTS idx_reports_client ON reports (client_id, reported_at DESC);`);
}

function addColumn(db: Database.Database, table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.some((entry) => entry.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/**
 * Copies rows from the previous German schema, translating enum values, then
 * removes the old tables. Runs once; afterwards `meldungen` no longer exists.
 */
function migrateFromGermanSchema(db: Database.Database) {
  const legacyExists = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'meldungen'`)
    .get();
  if (!legacyExists) return;

  const migrate = db.transaction(() => {
    db.exec(`
      INSERT INTO reports (
        public_id, reported_at, severity, latitude, longitude,
        street, district, postal_code, city,
        odor_type, duration, comment, source, reporter_hash, status, weather_status,
        wind_direction_deg, wind_speed_kmh, wind_gust_kmh,
        temperature_c, precipitation_mm, pressure_hpa, humidity_pct, weather_fetched_at
      )
      SELECT
        oeffentliche_id, gemeldet_am, staerke, breitengrad, laengengrad,
        strasse, stadtteil, plz, ort,
        CASE geruchsart
          WHEN 'faulig'     THEN 'rotten'
          WHEN 'blut'       THEN 'blood'
          WHEN 'guelle'     THEN 'manure'
          WHEN 'verbrannt'  THEN 'burnt'
          WHEN 'chemisch'   THEN 'chemical'
          WHEN 'suesslich'  THEN 'sweet'
          WHEN 'sonstiges'  THEN 'other'
          ELSE NULL
        END,
        CASE dauer
          WHEN 'kurz'           THEN 'short'
          WHEN 'anhaltend'      THEN 'persistent'
          WHEN 'wiederkehrend'  THEN 'recurring'
          ELSE NULL
        END,
        kommentar,
        CASE quelle WHEN 'kurzbefehl' THEN 'shortcut' ELSE 'web' END,
        melder_hash,
        CASE status WHEN 'verborgen' THEN 'hidden' ELSE 'visible' END,
        CASE wetter_status WHEN 'offen' THEN 'pending' WHEN 'fehler' THEN 'failed' ELSE 'ok' END,
        wind_richtung_grad, wind_geschwindigkeit, wind_boeen,
        temperatur, niederschlag, luftdruck, luftfeuchte, wetter_abgerufen_am
      FROM meldungen;

      DROP TABLE meldungen;
      DROP TABLE IF EXISTS ort_cache;
      DROP TABLE IF EXISTS idempotenz;
    `);
  });

  migrate();
}

declare global {
  // eslint-disable-next-line no-var
  var __byeSchlachthofDb: Database.Database | undefined;
}

export function db(): Database.Database {
  if (!globalThis.__byeSchlachthofDb) {
    globalThis.__byeSchlachthofDb = openConnection();
  }
  return globalThis.__byeSchlachthofDb;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function newPublicId(): string {
  const bytes = crypto.randomBytes(12);
  let id = "";
  for (const byte of bytes) id += ID_ALPHABET[byte % ID_ALPHABET.length];
  return id;
}

type Row = Record<string, unknown>;

function toReport(row: Row): Report {
  return {
    id: row.id as number,
    publicId: row.public_id as string,
    reportedAt: row.reported_at as string,
    severity: row.severity as Severity,
    latitude: (row.latitude as number) ?? null,
    longitude: (row.longitude as number) ?? null,
    street: (row.street as string) ?? null,
    district: (row.district as string) ?? null,
    postalCode: (row.postal_code as string) ?? null,
    city: (row.city as string) ?? null,
    odorType: (row.odor_type as OdorType) ?? null,
    duration: (row.duration as Duration) ?? null,
    comment: (row.comment as string) ?? null,
    source: row.source as ReportSource,
    status: row.status as ReportStatus,
    weatherStatus: row.weather_status as Report["weatherStatus"],
    windDirectionDeg: (row.wind_direction_deg as number) ?? null,
    windSpeedKmh: (row.wind_speed_kmh as number) ?? null,
    windGustKmh: (row.wind_gust_kmh as number) ?? null,
    temperatureC: (row.temperature_c as number) ?? null,
    precipitationMm: (row.precipitation_mm as number) ?? null,
    pressureHpa: (row.pressure_hpa as number) ?? null,
    humidityPct: (row.humidity_pct as number) ?? null,
    weatherFetchedAt: (row.weather_fetched_at as string) ?? null,
  };
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/**
 * `reported_at` holds ISO-8601, but `datetime('now')` writes
 * "YYYY-MM-DD HH:MM:SS". Columns filled by SQLite have to be compared in that
 * second form.
 */
function sqlTime(iso: string): string {
  return iso.slice(0, 19).replace("T", " ");
}

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
  clientId?: number | null;
  status?: ReportStatus;
}

export function createReport(input: NewReport): Report {
  const publicId = newPublicId();
  const reportedAt = input.reportedAt ?? new Date().toISOString();

  const info = db()
    .prepare(
      `INSERT INTO reports (
         public_id, reported_at, severity, latitude, longitude,
         odor_type, duration, comment, source, reporter_hash, client_id, status
       ) VALUES (
         @publicId, @reportedAt, @severity, @latitude, @longitude,
         @odorType, @duration, @comment, @source, @reporterHash, @clientId, @status
       )`,
    )
    .run({
      ...input,
      publicId,
      reportedAt,
      clientId: input.clientId ?? null,
      status: input.status ?? "visible",
    });

  return reportById(Number(info.lastInsertRowid))!;
}

export function attachWeather(id: number, weather: Weather | null): void {
  if (!weather) {
    db().prepare(`UPDATE reports SET weather_status = 'failed' WHERE id = ?`).run(id);
    return;
  }

  db()
    .prepare(
      `UPDATE reports SET
         weather_status = 'ok',
         wind_direction_deg = @windDirectionDeg,
         wind_speed_kmh = @windSpeedKmh,
         wind_gust_kmh = @windGustKmh,
         temperature_c = @temperatureC,
         precipitation_mm = @precipitationMm,
         pressure_hpa = @pressureHpa,
         humidity_pct = @humidityPct,
         weather_fetched_at = @fetchedAt
       WHERE id = @id`,
    )
    .run({ ...weather, id });
}

export function attachLocation(id: number, location: LocationInfo | null): void {
  if (!location || (!location.street && !location.district)) return;

  db()
    .prepare(
      `UPDATE reports SET
         street = COALESCE(@street, street),
         district = COALESCE(@district, district),
         postal_code = COALESCE(@postalCode, postal_code),
         city = COALESCE(@city, city)
       WHERE id = @id`,
    )
    .run({ ...location, id });
}

export function setReportStatus(id: number, status: ReportStatus): void {
  db().prepare(`UPDATE reports SET status = ? WHERE id = ?`).run(status, id);
}

export function deleteReport(id: number): void {
  db().prepare(`DELETE FROM reports WHERE id = ?`).run(id);
}

/* ------------------------------------------------------------------ */
/* Location cache                                                      */
/* ------------------------------------------------------------------ */

export function cachedLocation(cell: string): LocationInfo | null {
  const row = db()
    .prepare(
      `SELECT street, district, postal_code AS postalCode, city
       FROM location_cache WHERE cell = ?`,
    )
    .get(cell) as LocationInfo | undefined;
  return row ?? null;
}

export function cacheLocation(cell: string, location: LocationInfo): void {
  db()
    .prepare(
      `INSERT OR REPLACE INTO location_cache (cell, street, district, postal_code, city, created_at)
       VALUES (@cell, @street, @district, @postalCode, @city, datetime('now'))`,
    )
    .run({ cell, ...location });
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export function reportById(id: number): Report | null {
  const row = db().prepare(`SELECT * FROM reports WHERE id = ?`).get(id) as Row | undefined;
  return row ? toReport(row) : null;
}

export function reportByPublicId(publicId: string): Report | null {
  const row = db().prepare(`SELECT * FROM reports WHERE public_id = ?`).get(publicId) as
    | Row
    | undefined;
  return row ? toReport(row) : null;
}

export function recentReports(limit = 20): Report[] {
  const rows = db()
    .prepare(
      `SELECT * FROM reports
       WHERE status = 'visible'
       ORDER BY reported_at DESC
       LIMIT ?`,
    )
    .all(limit) as Row[];
  return rows.map(toReport);
}

/** Visible reports from the last N hours, newest first. */
export function recentReportsSince(hours: number, limit: number): Report[] {
  const rows = db()
    .prepare(
      `SELECT * FROM reports
       WHERE status = 'visible' AND reported_at >= ?
       ORDER BY reported_at DESC
       LIMIT ?`,
    )
    .all(hoursAgo(hours), limit) as Row[];
  return rows.map(toReport);
}

export function allReportsForAdmin(limit = 200, offset = 0): Report[] {
  const rows = db()
    .prepare(`SELECT * FROM reports ORDER BY reported_at DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as Row[];
  return rows.map(toReport);
}

export function totalReportCount(): number {
  const row = db().prepare(`SELECT COUNT(*) AS n FROM reports`).get() as { n: number };
  return row.n;
}

export function hiddenReportCount(): number {
  const row = db()
    .prepare(`SELECT COUNT(*) AS n FROM reports WHERE status = 'hidden'`)
    .get() as { n: number };
  return row.n;
}

export function pendingReportCount(): number {
  const row = db()
    .prepare(`SELECT COUNT(*) AS n FROM reports WHERE status = 'pending'`)
    .get() as { n: number };
  return row.n;
}

/**
 * One entry per sender and hour.
 *
 * Public figures are built on this rather than on raw rows, so no single
 * sender can move them however often they press the button. Pressing it ten
 * times in an hour counts once, at the highest severity of the ten; ten
 * neighbours count ten times. Senders without a check value cannot be told
 * apart from each other and therefore each stand for themselves.
 *
 * Deliberately independent of the street: it is filled in asynchronously, and
 * a burst arriving faster than the lookups would otherwise slip through while
 * the rows still say nothing about where they came from.
 */
const DISTINCT_REPORTS = `
  SELECT MAX(severity) AS severity, MAX(reported_at) AS reported_at
  FROM reports
  WHERE status = 'visible' AND reported_at >= @since
  GROUP BY COALESCE(reporter_hash, public_id), strftime('%Y-%m-%dT%H', reported_at)
`;

/**
 * The same idea for the street figures, where the street has to stay part of
 * the key — one sender counts once per street and hour. Rows without a
 * resolved street play no part in these figures anyway.
 */
const DISTINCT_BY_STREET = `
  SELECT MAX(severity) AS severity, MAX(reported_at) AS reported_at, street
  FROM reports
  WHERE status = 'visible' AND reported_at >= @since AND street IS NOT NULL
  GROUP BY COALESCE(reporter_hash, public_id), street, strftime('%Y-%m-%dT%H', reported_at)
`;

/** All reports in the window, whatever their status — feeds the surge brake. */
export function reportCountSince(minutes: number): number {
  const row = db()
    .prepare(`SELECT COUNT(*) AS n FROM reports WHERE reported_at >= ?`)
    .get(minutesAgo(minutes)) as { n: number };
  return row.n;
}

/**
 * Reports per clock hour over the given number of days, oldest first, with
 * quiet hours included as zeros — otherwise the median would describe only
 * the busy hours and the brake would sit far too high.
 */
export function hourlyReportCounts(days: number): number[] {
  const since = hoursAgo(days * 24);

  const rows = db()
    .prepare(
      `SELECT strftime('%Y-%m-%dT%H', reported_at) AS hour, COUNT(*) AS n
       FROM reports
       WHERE reported_at >= ?
       GROUP BY hour`,
    )
    .all(since) as { hour: string; n: number }[];

  const counts = new Map(rows.map((row) => [row.hour, row.n]));
  const buckets: number[] = [];
  const start = new Date(since);
  start.setUTCMinutes(0, 0, 0);

  for (let index = 0; index < days * 24; index++) {
    const moment = new Date(start.getTime() + index * 3600_000);
    buckets.push(counts.get(moment.toISOString().slice(0, 13)) ?? 0);
  }

  return buckets;
}

export function currentSituation(): Situation {
  const connection = db();

  const window = (hours: number) =>
    connection
      .prepare(
        `SELECT COUNT(*) AS count, AVG(severity) AS average, MAX(severity) AS maximum
         FROM (${DISTINCT_REPORTS})`,
      )
      .get({ since: hoursAgo(hours) }) as {
      count: number;
      average: number | null;
      maximum: number | null;
    };

  const last2h = window(2);
  const last24h = window(24);
  const last7d = window(24 * 7);

  const latest = connection
    .prepare(`SELECT * FROM reports WHERE status = 'visible' ORDER BY reported_at DESC LIMIT 1`)
    .get() as Row | undefined;

  const streets = connection
    .prepare(
      `SELECT street, COUNT(*) AS count
       FROM (${DISTINCT_BY_STREET})
       GROUP BY street
       ORDER BY count DESC
       LIMIT 5`,
    )
    .all({ since: hoursAgo(6) }) as { street: string }[];

  // Most recent weather reading, at most three hours old.
  const weatherRow = connection
    .prepare(
      `SELECT wind_direction_deg, wind_speed_kmh, precipitation_mm, temperature_c
       FROM reports
       WHERE weather_status = 'ok' AND reported_at >= ?
       ORDER BY reported_at DESC LIMIT 1`,
    )
    .get(hoursAgo(3)) as
    | {
        wind_direction_deg: number | null;
        wind_speed_kmh: number | null;
        precipitation_mm: number | null;
        temperature_c: number | null;
      }
    | undefined;

  return {
    reports2h: last2h.count,
    reports24h: last24h.count,
    reports7d: last7d.count,
    averageSeverity2h: last2h.average,
    averageSeverity24h: last24h.average,
    maxSeverity2h: (last2h.maximum as Severity) ?? null,
    lastReportAt: latest ? (latest.reported_at as string) : null,
    activeStreets: streets.map((s) => s.street),
    weather: weatherRow
      ? {
          windDirectionDeg: weatherRow.wind_direction_deg,
          windSpeedKmh: weatherRow.wind_speed_kmh,
          precipitationMm: weatherRow.precipitation_mm,
          temperatureC: weatherRow.temperature_c,
        }
      : null,
  };
}

export function streetStats(sinceIso: string, limit = 8): StreetStat[] {
  const rows = db()
    .prepare(
      `SELECT street,
              COUNT(*) AS count,
              AVG(severity) AS average,
              MAX(reported_at) AS latest
       FROM (${DISTINCT_BY_STREET})
       GROUP BY street
       ORDER BY count DESC, latest DESC
       LIMIT @limit`,
    )
    .all({ since: sinceIso, limit }) as {
    street: string;
    count: number;
    average: number;
    latest: string;
  }[];

  return rows.map((row) => ({
    street: row.street,
    count: row.count,
    averageSeverity: row.average,
    lastReportAt: row.latest,
  }));
}

/** Number of reports from the same sender inside the given window. */
export function reportCountFromReporter(reporterHash: string, minutes: number): number {
  const row = db()
    .prepare(`SELECT COUNT(*) AS n FROM reports WHERE reporter_hash = ? AND reported_at >= ?`)
    .get(reporterHash, new Date(Date.now() - minutes * 60_000).toISOString()) as { n: number };
  return row.n;
}

/* ------------------------------------------------------------------ */
/* Idempotency                                                         */
/* ------------------------------------------------------------------ */

/**
 * Repeated requests carrying the same key must not create a second report —
 * important when a shortcut retries on a flaky connection.
 */
export function reportForIdempotencyKey(key: string): Report | null {
  const row = db()
    .prepare(`SELECT report_id FROM idempotency_keys WHERE key = ?`)
    .get(key) as { report_id: number } | undefined;
  if (!row) return null;
  return reportById(row.report_id);
}

export function rememberIdempotencyKey(key: string, reportId: number): void {
  db()
    .prepare(
      `INSERT OR IGNORE INTO idempotency_keys (key, report_id, created_at)
       VALUES (?, ?, datetime('now'))`,
    )
    .run(key, reportId);
}

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

function toClient(row: Row): ReportingClient {
  return {
    id: row.id as number,
    publicId: row.public_id as string,
    kind: row.kind as ClientKind,
    status: row.status as ClientStatus,
    createdAt: row.created_at as string,
    lastSeenAt: (row.last_seen_at as string) ?? null,
    reportCount: row.report_count as number,
  };
}

export interface NewClient {
  publicId: string;
  secretHash: string;
  kind: ClientKind;
  reporterHash: string | null;
}

export function createClient(input: NewClient): ReportingClient {
  const info = db()
    .prepare(
      `INSERT INTO clients (public_id, secret_hash, kind, reporter_hash, created_at)
       VALUES (@publicId, @secretHash, @kind, @reporterHash, datetime('now'))`,
    )
    .run(input);

  return clientById(Number(info.lastInsertRowid))!;
}

export function clientById(id: number): ReportingClient | null {
  const row = db().prepare(`SELECT * FROM clients WHERE id = ?`).get(id) as Row | undefined;
  return row ? toClient(row) : null;
}

/** Returns the stored secret hash alongside the client, for verification. */
export function clientByPublicId(
  publicId: string,
): (ReportingClient & { secretHash: string }) | null {
  const row = db().prepare(`SELECT * FROM clients WHERE public_id = ?`).get(publicId) as
    | Row
    | undefined;
  return row ? { ...toClient(row), secretHash: row.secret_hash as string } : null;
}

export function touchClient(id: number): void {
  db().prepare(`UPDATE clients SET last_seen_at = datetime('now') WHERE id = ?`).run(id);
}

export function countClientReport(id: number): void {
  db()
    .prepare(
      `UPDATE clients
       SET report_count = report_count + 1, last_seen_at = datetime('now')
       WHERE id = ?`,
    )
    .run(id);
}

export function setClientStatus(id: number, status: ClientStatus): void {
  db().prepare(`UPDATE clients SET status = ? WHERE id = ?`).run(status, id);
}

/**
 * Hides everything one client ever sent. Used together with revoking, so a
 * single click undoes a flood instead of the reports having to be picked off
 * one by one.
 */
export function hideReportsFromClient(id: number): number {
  const info = db()
    .prepare(`UPDATE reports SET status = 'hidden' WHERE client_id = ? AND status != 'hidden'`)
    .run(id);
  return info.changes;
}

export function listClients(limit = 100): ReportingClient[] {
  const rows = db()
    .prepare(`SELECT * FROM clients ORDER BY last_seen_at DESC NULLS LAST, created_at DESC LIMIT ?`)
    .all(limit) as Row[];
  return rows.map(toClient);
}

export function clientCount(): number {
  const row = db().prepare(`SELECT COUNT(*) AS n FROM clients`).get() as { n: number };
  return row.n;
}

/** Reports this client sent inside the window — the per-token quota. */
export function reportCountFromClient(clientId: number, minutes: number): number {
  const row = db()
    .prepare(`SELECT COUNT(*) AS n FROM reports WHERE client_id = ? AND reported_at >= ?`)
    .get(clientId, minutesAgo(minutes)) as { n: number };
  return row.n;
}

/** How many clients one address enrolled inside the window. */
export function clientCountFromReporter(reporterHash: string, minutes: number): number {
  const row = db()
    .prepare(`SELECT COUNT(*) AS n FROM clients WHERE reporter_hash = ? AND created_at >= ?`)
    .get(reporterHash, sqlTime(minutesAgo(minutes))) as { n: number };
  return row.n;
}

/* ------------------------------------------------------------------ */
/* Challenges                                                          */
/* ------------------------------------------------------------------ */

/**
 * Records a solved challenge. Returns false if it was already spent — one
 * solution mints one token, otherwise a single piece of work could be
 * replayed indefinitely.
 */
export function claimChallenge(signature: string, expiresAt: string): boolean {
  const connection = db();
  connection.prepare(`DELETE FROM used_challenges WHERE expires_at < datetime('now')`).run();

  const info = connection
    .prepare(`INSERT OR IGNORE INTO used_challenges (signature, expires_at) VALUES (?, ?)`)
    .run(signature, sqlTime(expiresAt));

  return info.changes === 1;
}
