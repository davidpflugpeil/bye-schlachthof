/**
 * Copies reports from one Postgres database into another — for moving to a
 * new host without losing what was reported on the old one.
 *
 * Usage:
 *   SOURCE_DATABASE_URL=postgresql://… TARGET_DATABASE_URL=postgresql://… npm run db:import
 *
 * The target needs the schema already: start the app against it once. Reports
 * are matched by their public id, so running the import twice, or after new
 * reports arrived on the target, adds nothing twice. Internal ids are assigned
 * fresh. Idempotency keys are not copied — they only matter for a few seconds.
 * Only counts are printed, never report contents.
 */
import pg from "pg";

const SOURCE = process.env.SOURCE_DATABASE_URL;
const TARGET = process.env.TARGET_DATABASE_URL;

if (!SOURCE || !TARGET) {
  console.error("SOURCE_DATABASE_URL and TARGET_DATABASE_URL must both be set.");
  process.exit(1);
}
if (SOURCE === TARGET) {
  console.error("Source and target are the same database.");
  process.exit(1);
}

function detectTls(url) {
  if (/sslmode=(disable|allow)/.test(url)) return false;
  if (/sslmode=(require|verify-ca|verify-full)/.test(url)) return true;
  try {
    return !["localhost", "127.0.0.1", "::1", ""].includes(new URL(url).hostname);
  } catch {
    return true;
  }
}

const connect = (url) =>
  new pg.Client({
    connectionString: url,
    ssl: detectTls(url) ? { rejectUnauthorized: false } : undefined,
  });

/** Every column except the identity key, which the target assigns itself. */
const REPORT_COLUMNS = [
  "public_id", "reported_at", "severity", "latitude", "longitude",
  "street", "house_number", "district", "postal_code", "city",
  "odor_type", "duration", "comment", "source", "reporter_hash", "status",
  "weather_status", "wind_direction_deg", "wind_speed_kmh", "wind_gust_kmh",
  "temperature_c", "precipitation_mm", "pressure_hpa", "humidity_pct",
  "weather_fetched_at", "created_at",
];

const CACHE_COLUMNS = [
  "cell", "street", "house_number", "district", "postal_code", "city",
  "source_lat", "source_lon", "created_at",
];

function insertStatement(table, columns, conflictColumn) {
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})
          ON CONFLICT (${conflictColumn}) DO NOTHING`;
}

const source = connect(SOURCE);
const target = connect(TARGET);
await source.connect();
await target.connect();

try {
  const { rows: tables } = await target.query(
    `SELECT COUNT(*)::int AS n FROM information_schema.tables
     WHERE table_schema = current_schema() AND table_name IN ('reports', 'location_cache')`,
  );
  if (tables[0].n < 2) {
    throw new Error("The target has no schema yet — start the app against it once first.");
  }

  const reports = await source.query(
    `SELECT ${REPORT_COLUMNS.join(", ")} FROM reports ORDER BY reported_at`,
  );
  const cache = await source.query(`SELECT ${CACHE_COLUMNS.join(", ")} FROM location_cache`);

  await target.query("BEGIN");
  let addedReports = 0;
  for (const row of reports.rows) {
    const result = await target.query(
      insertStatement("reports", REPORT_COLUMNS, "public_id"),
      REPORT_COLUMNS.map((column) => row[column]),
    );
    addedReports += result.rowCount;
  }
  let addedCache = 0;
  for (const row of cache.rows) {
    const result = await target.query(
      insertStatement("location_cache", CACHE_COLUMNS, "cell"),
      CACHE_COLUMNS.map((column) => row[column]),
    );
    addedCache += result.rowCount;
  }
  await target.query("COMMIT");

  const { rows: totals } = await target.query("SELECT COUNT(*)::int AS n FROM reports");
  console.log(
    `Reports: ${reports.rowCount} in source, ${addedReports} added, ${totals[0].n} in target now.`,
  );
  console.log(`Location cache: ${cache.rowCount} in source, ${addedCache} added.`);
} catch (error) {
  await target.query("ROLLBACK").catch(() => {});
  console.error(`Import failed, nothing was written: ${error.message}`);
  process.exitCode = 1;
} finally {
  await source.end();
  await target.end();
}
