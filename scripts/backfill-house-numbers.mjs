#!/usr/bin/env node
// Fills house_number for reports stored before the column existed.
//
//   node scripts/backfill-house-numbers.mjs            # dry run, changes nothing
//   node scripts/backfill-house-numbers.mjs --apply    # writes
//
// Reads DATABASE_URL (or POSTGRES_URL) from the environment, same as the app.
// Nominatim allows one request per second, so a few hundred rows take a few
// minutes. The script may be interrupted and restarted at any point — it only
// ever looks at rows that still have no house number.

import { readFileSync } from "node:fs";
import pg from "pg";

const APPLY = process.argv.includes("--apply");
const REQUEST_INTERVAL_MS = 1100;
const HEADERS = {
  "User-Agent": "ByeSchlachthof/0.1 (Nachbarschaftsprojekt Muenchen)",
  "Accept-Language": "de",
};

function connectionString() {
  const fromEnv = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
  if (fromEnv) return fromEnv;

  // Convenience for local runs: fall back to .env.local rather than requiring
  // the variable to be exported by hand.
  try {
    const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const match = file.match(/^(?:DATABASE_URL|POSTGRES_URL)=(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* no .env.local — fall through to the error below */
  }

  throw new Error("Keine Datenbankverbindung: DATABASE_URL oder POSTGRES_URL setzen.");
}

function needsTls(url) {
  if (/sslmode=(disable|allow)/.test(url)) return false;
  if (/sslmode=(require|verify-ca|verify-full)/.test(url)) return true;
  try {
    return !["localhost", "127.0.0.1", "::1", ""].includes(new URL(url).hostname);
  } catch {
    return true;
  }
}

async function houseNumberAt(latitude, longitude) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", latitude.toFixed(6));
  url.searchParams.set("lon", longitude.toFixed(6));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Nominatim antwortete mit ${response.status}`);

  const data = await response.json();
  return data.address?.house_number ?? null;
}

const url = connectionString();
const client = new pg.Client({
  connectionString: url,
  ssl: needsTls(url) ? { rejectUnauthorized: false } : undefined,
});
await client.connect();

const { rows } = await client.query(
  `SELECT id, public_id, latitude, longitude, street
     FROM reports
    WHERE house_number IS NULL
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
    ORDER BY reported_at DESC`,
);

console.log(
  `${rows.length} Meldungen ohne Hausnummer` +
    (APPLY ? "" : " — Probelauf, es wird nichts geschrieben (--apply zum Schreiben)"),
);

let found = 0;
let missing = 0;
let failed = 0;

for (const [index, row] of rows.entries()) {
  let houseNumber = null;
  try {
    houseNumber = await houseNumberAt(row.latitude, row.longitude);
  } catch (error) {
    failed += 1;
    console.log(`  ${row.public_id}  Fehler: ${error.message}`);
    await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS));
    continue;
  }

  if (houseNumber) {
    found += 1;
    if (APPLY) {
      await client.query(`UPDATE reports SET house_number = $2 WHERE id = $1`, [
        row.id,
        houseNumber,
      ]);
    }
    console.log(`  ${row.public_id}  ${row.street ?? "?"} ${houseNumber}`);
  } else {
    missing += 1;
  }

  // Nominatim's usage policy allows one request per second.
  if (index < rows.length - 1) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS));
  }
}

console.log(
  `\nFertig: ${found} gefunden, ${missing} ohne Hausnummer bei OpenStreetMap, ${failed} fehlgeschlagen.` +
    (APPLY ? "" : "\nNichts geschrieben — mit --apply erneut ausführen."),
);

await client.end();
