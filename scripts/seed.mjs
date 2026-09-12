/**
 * Creates reproducible test data for development.
 * Usage: node scripts/seed.mjs [days]
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DAYS = Number(process.argv[2] ?? 14);
const FILE =
  process.env.DATABASE_PATH || path.join(process.cwd(), "data", "bye-schlachthof.db");

fs.mkdirSync(path.dirname(FILE), { recursive: true });
const db = new Database(FILE);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    reported_at TEXT NOT NULL,
    severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
    latitude REAL, longitude REAL,
    street TEXT, district TEXT, postal_code TEXT, city TEXT,
    odor_type TEXT, duration TEXT, comment TEXT,
    source TEXT NOT NULL DEFAULT 'web',
    reporter_hash TEXT,
    status TEXT NOT NULL DEFAULT 'visible',
    weather_status TEXT NOT NULL DEFAULT 'pending',
    wind_direction_deg REAL, wind_speed_kmh REAL, wind_gust_kmh REAL,
    temperature_c REAL, precipitation_mm REAL, pressure_hpa REAL, humidity_pct REAL,
    weather_fetched_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_reports_time ON reports (reported_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status, reported_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports (reporter_hash, reported_at DESC);
  CREATE TABLE IF NOT EXISTS location_cache (
    cell TEXT PRIMARY KEY, street TEXT, district TEXT, postal_code TEXT, city TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT PRIMARY KEY, report_id INTEGER NOT NULL, created_at TEXT NOT NULL
  );
`);

const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const newId = () =>
  [...crypto.randomBytes(12)].map((byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");

/**
 * Streets in and directly around the Schlachthofviertel.
 * `weight` controls how often a street appears — right at the slaughterhouse
 * people report considerably more often.
 */
const STREETS = [
  { street: "Zenettistraße", district: "Am Schlachthof", postalCode: "80337", lat: 48.1258, lon: 11.5528, weight: 9 },
  { street: "Tumblingerstraße", district: "Am Schlachthof", postalCode: "80337", lat: 48.1273, lon: 11.5602, weight: 7 },
  { street: "Thalkirchner Straße", district: "Am Schlachthof", postalCode: "80337", lat: 48.1232, lon: 11.556, weight: 8 },
  { street: "Ehrengutstraße", district: "Am Schlachthof", postalCode: "80337", lat: 48.1252, lon: 11.5559, weight: 6 },
  { street: "Lagerhausstraße", district: "Am Schlachthof", postalCode: "80339", lat: 48.1216, lon: 11.5518, weight: 5 },
  { street: "Schmellerstraße", district: "Am Schlachthof", postalCode: "80337", lat: 48.1272, lon: 11.5497, weight: 5 },
  { street: "Kapuzinerstraße", district: "Ludwigsvorstadt", postalCode: "80337", lat: 48.1289, lon: 11.5606, weight: 4 },
  { street: "Maistraße", district: "Ludwigsvorstadt", postalCode: "80337", lat: 48.1305, lon: 11.5613, weight: 3 },
  { street: "Lindwurmstraße", district: "Ludwigsvorstadt", postalCode: "80337", lat: 48.128, lon: 11.5555, weight: 3 },
  { street: "Pestalozzistraße", district: "Ludwigsvorstadt", postalCode: "80469", lat: 48.1295, lon: 11.5658, weight: 2 },
  { street: "Dreimühlenstraße", district: "Glockenbachviertel", postalCode: "80469", lat: 48.1236, lon: 11.5647, weight: 3 },
  { street: "Poccistraße", district: "Sendling", postalCode: "80339", lat: 48.1226, lon: 11.5469, weight: 4 },
  { street: "Oberländerstraße", district: "Sendling", postalCode: "81371", lat: 48.1197, lon: 11.5461, weight: 3 },
  { street: "Isartalstraße", district: "Sendling", postalCode: "80469", lat: 48.1208, lon: 11.5512, weight: 3 },
];

const WEIGHTED_STREETS = STREETS.flatMap((entry) =>
  Array.from({ length: entry.weight }, () => entry),
);

const ODOR_TYPES = ["rotten", "blood", "manure", "chemical", "other", null, null];
const DURATIONS = ["short", "persistent", "recurring", null, null];
/** German comments, as a real reporter would write them. */
const COMMENTS = [
  null,
  null,
  null,
  "Besonders auffällig Richtung Innenhof.",
  "Fenster mussten geschlossen werden.",
  "Zieht seit etwa einer halben Stunde durch die Straße.",
];

const between = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const insert = db.prepare(`
  INSERT INTO reports (
    public_id, reported_at, severity, latitude, longitude,
    street, district, postal_code, city, odor_type, duration, comment,
    source, reporter_hash, status, weather_status,
    wind_direction_deg, wind_speed_kmh, wind_gust_kmh, temperature_c,
    precipitation_mm, pressure_hpa, humidity_pct, weather_fetched_at
  ) VALUES (
    @publicId, @reportedAt, @severity, @latitude, @longitude,
    @street, @district, @postalCode, 'München', @odorType, @duration, @comment,
    @source, @reporterHash, 'visible', 'ok',
    @windDirectionDeg, @windSpeedKmh, @windGustKmh, @temperatureC,
    @precipitationMm, @pressureHpa, @humidityPct, @reportedAt
  )
`);

let created = 0;
const now = Date.now();

function addReport(moment, dailyWind, rainyDay, intense) {
  const place = pick(WEIGHTED_STREETS);
  // Slight scatter along the street, with no link to a house number.
  const latitude = place.lat + between(-0.0009, 0.0009);
  const longitude = place.lon + between(-0.0013, 0.0013);
  const base = intense ? between(2.6, 5.4) : between(1.2, 4.2);

  insert.run({
    publicId: newId(),
    reportedAt: moment.toISOString(),
    severity: Math.min(5, Math.max(1, Math.round(base))),
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
    street: place.street,
    district: place.district,
    postalCode: place.postalCode,
    odorType: pick(ODOR_TYPES),
    duration: pick(DURATIONS),
    comment: pick(COMMENTS),
    source: Math.random() < 0.25 ? "shortcut" : "web",
    reporterHash: `test${Math.floor(between(0, 40))}`,
    windDirectionDeg: Number((dailyWind + between(-25, 25)).toFixed(0)),
    windSpeedKmh: Number(between(4, 24).toFixed(1)),
    windGustKmh: Number(between(10, 42).toFixed(1)),
    temperatureC: Number(between(6, 27).toFixed(1)),
    precipitationMm: rainyDay ? Number(between(0, 3.2).toFixed(1)) : 0,
    pressureHpa: Number(between(985, 1025).toFixed(1)),
    humidityPct: Number(between(38, 92).toFixed(0)),
  });
  created += 1;
}

const seedAll = db.transaction(() => {
  for (let day = DAYS - 1; day >= 0; day -= 1) {
    // South-westerly wind dominates — that is when the smell drifts over the quarter.
    const dailyWind = Math.random() < 0.6 ? between(200, 250) : between(0, 360);
    const rainyDay = Math.random() < 0.25;
    const intense = Math.random() < 0.3;
    const amount = intense ? Math.round(between(9, 22)) : Math.round(between(0, 7));

    for (let i = 0; i < amount; i += 1) {
      // Clustered in the early evening, with a second peak in the early morning.
      const hour = Math.random() < 0.55 ? Math.round(between(17, 22)) : Math.round(between(5, 16));
      const moment = new Date(now - day * 86_400_000);
      moment.setHours(hour, Math.floor(between(0, 60)), Math.floor(between(0, 60)), 0);
      if (moment.getTime() > now) continue;
      addReport(moment, dailyWind, rainyDay, intense);
    }
  }
});

seedAll();

// Make sure the last couple of hours are not empty.
const recent = db
  .prepare(`SELECT COUNT(*) AS n FROM reports WHERE reported_at >= ?`)
  .get(new Date(now - 2 * 3_600_000).toISOString()).n;

if (recent === 0) {
  for (let i = 0; i < 4; i += 1) {
    addReport(new Date(now - between(5, 105) * 60_000), 228, false, true);
  }
}

const total = db.prepare(`SELECT COUNT(*) AS n FROM reports`).get().n;
console.log(`${created} test reports created. The database now holds ${total} reports.`);
console.log(`File: ${FILE}`);
