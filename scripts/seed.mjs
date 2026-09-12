/**
 * Creates reproducible test data for development.
 * Usage: DATABASE_URL=postgresql://... node scripts/seed.mjs [days]
 */
import { randomBytes } from "node:crypto";
import pg from "pg";

const DAYS = Number(process.argv[2] ?? 14);
const CONNECTION = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!CONNECTION) {
  console.error("DATABASE_URL or POSTGRES_URL must be set.");
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
const needsTls = detectTls(CONNECTION);

const pool = new pg.Pool({
  connectionString: CONNECTION,
  ssl: needsTls ? { rejectUnauthorized: false } : undefined,
});

const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const newId = () =>
  [...randomBytes(12)].map((byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");

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

const WEIGHTED = STREETS.flatMap((entry) => Array.from({ length: entry.weight }, () => entry));

const ODOR_TYPES = ["rotten", "blood", "manure", "chemical", "other", null, null];
const DURATIONS = ["short", "persistent", "recurring", null, null];
/** German comments, as a real reporter would write them. */
const COMMENTS = [
  null, null, null,
  "Besonders auffällig Richtung Innenhof.",
  "Fenster mussten geschlossen werden.",
  "Zieht seit etwa einer halben Stunde durch die Straße.",
];

const between = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const rows = [];
const now = Date.now();

function addReport(moment, dailyWind, rainyDay, intense) {
  const place = pick(WEIGHTED);
  // Slight scatter along the street, with no link to a house number.
  const base = intense ? between(2.6, 5.4) : between(1.2, 4.2);
  rows.push([
    newId(),
    moment.toISOString(),
    Math.min(5, Math.max(1, Math.round(base))),
    Number((place.lat + between(-0.0009, 0.0009)).toFixed(6)),
    Number((place.lon + between(-0.0013, 0.0013)).toFixed(6)),
    place.street,
    place.district,
    place.postalCode,
    "München",
    pick(ODOR_TYPES),
    pick(DURATIONS),
    pick(COMMENTS),
    Math.random() < 0.25 ? "shortcut" : "web",
    `test${Math.floor(between(0, 40))}`,
    "ok",
    Number((dailyWind + between(-25, 25)).toFixed(0)),
    Number(between(4, 24).toFixed(1)),
    Number(between(10, 42).toFixed(1)),
    Number(between(6, 27).toFixed(1)),
    rainyDay ? Number(between(0, 3.2).toFixed(1)) : 0,
    Number(between(985, 1025).toFixed(1)),
    Number(between(38, 92).toFixed(0)),
    moment.toISOString(),
  ]);
}

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

// Make sure the last couple of hours are not empty.
if (!rows.some((row) => Date.parse(row[1]) >= now - 2 * 3_600_000)) {
  for (let i = 0; i < 4; i += 1) {
    addReport(new Date(now - between(5, 105) * 60_000), 228, false, true);
  }
}

const COLUMNS = [
  "public_id", "reported_at", "severity", "latitude", "longitude",
  "street", "district", "postal_code", "city", "odor_type", "duration", "comment",
  "source", "reporter_hash", "weather_status",
  "wind_direction_deg", "wind_speed_kmh", "wind_gust_kmh", "temperature_c",
  "precipitation_mm", "pressure_hpa", "humidity_pct", "weather_fetched_at",
];

const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const row of rows) {
    const placeholders = row.map((_, index) => `$${index + 1}`).join(", ");
    await client.query(
      `INSERT INTO reports (${COLUMNS.join(", ")}) VALUES (${placeholders})
       ON CONFLICT (public_id) DO NOTHING`,
      row,
    );
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
}

const { rows: [{ count }] } = await pool.query("SELECT COUNT(*) AS count FROM reports");
console.log(`${rows.length} test reports created. The database now holds ${count} reports.`);
await pool.end();
