# Bye Schlachthof

A lean web app for neighbours in Munich's Schlachthofviertel to document odor
nuisance in seconds. Every report is automatically enriched with wind and
weather data and attributed to a street — never to a house number.

**Language split:** the entire user interface is German. Code — identifiers,
file names, comments, API paths, JSON fields and enum values — is English.
Only human-readable strings are German.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD
npm run seed                 # optional: test data
npm run dev
```

The app then runs on <http://localhost:3000>.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production bundle |
| `npm run start` | Production server |
| `npm run seed` | 14 days of test data (`npm run seed -- 30` for 30 days) |
| `npm run icons` | Regenerate all icon sizes from `assets/coat-of-arms.png` |
| `npm run api:check` | Exercise every API endpoint |

---

## Environment variables

| Variable | Required | Meaning |
| --- | --- | --- |
| `ADMIN_PASSWORD` | for `/admin` | Password for the admin area. Without it `/admin` is disabled. |
| `ADMIN_SECRET` | no | Extra key material for the session cookie. |
| `REPORT_TOKEN` | recommended | Marks trusted clients (the shortcut) and raises their hourly limit. |
| `REPORTER_SALT` | recommended | Salt for the reporter check value used for abuse protection. |
| `DATABASE_PATH` | no | Path to the SQLite file. Default: `./data/bye-schlachthof.db`. |
| `BASE_URL` | for production | Public address, read at runtime. Drives the CORS allowance for writes. |
| `API_CORS_ORIGINS` | no | Additional origins allowed to write, comma separated. `*` opens it fully. |
| `NEXT_PUBLIC_BASE_URL` | for production | Public address for metadata and the shortcut page. Inlined at build time. |
| `NEXT_PUBLIC_SHORTCUT_URL` | no | iCloud link of the shortcut. Overrides the published one baked into the page. |

---

## Layout

```
assets/           Source files, not served
src/
  app/            Pages (App Router) and API routes
    api/v1/       reports, situation, streets, addresses, meta, openapi
    admin/        Admin area including CSV export
  components/     Feature components (report form, status card, street ranking)
    ui/           Design system primitives
  lib/            Database, weather, geo, formatting, API layer
data/             SQLite file, created on first start
scripts/          seed, icon generation, API check
```

Page URLs stay German (`/melden`, `/ueber`, `/kurzbefehl`, `/datenschutz`) —
they are part of the user-facing content.

**Storage:** SQLite via `better-sqlite3`. The schema is created on first access
(`src/lib/db.ts`). Switching to PostgreSQL means replacing the functions in that
one file.

An earlier version of this project used German table and column names. The
connection setup migrates such a database automatically: rows are copied into
the `reports` table with the enum values translated, the old tables are dropped,
and a `data/geruchsmelder.db` file is renamed. This runs once and needs no
intervention.

**Brand mark:** the source is `assets/coat-of-arms.png` (1254 × 1254). All icon
sizes are derived from it with `npm run icons` (requires Pillow). The script
makes the white margin outside the shield transparent, crops to the artwork and
writes `public/coat-of-arms-header.png`, `icon-32/64/192/512.png`,
`apple-icon.png` and a maskable icon with a safe area for Android.

**External services:** Open-Meteo (weather) and Nominatim/OpenStreetMap (address
search plus street and district for a coordinate). Both are used without a key;
results are cached in `location_cache` to roughly 11 metres so repeated reports
from one address cause no further lookup.

**Privacy in the implementation:** the house number is deliberately dropped from
the reverse lookup (`resolveLocation` in `src/lib/geo.ts`) — only street,
district, postal code and city are stored. Published fields are street and
district; exact coordinates leave the database only in the admin area and the
CSV export.

---

## API

One API for both clients: the web frontend and the iPhone shortcut talk to the
same endpoints under `/api/v1`. Machine-readable description:
`GET /api/v1/openapi` (OpenAPI 3.1).

**Response shape.** Every response carries `ok: true|false`. On failure it
carries `error.code` (stable, for switching on) and `error.message` (German, for
display). In addition every response — success or failure — carries `message`: a
ready-made German sentence a client can show verbatim. The shortcut therefore
needs no logic of its own.

```json
{ "ok": false,
  "error": { "code": "location_missing", "message": "Für die Meldung fehlt …" },
  "message": "Für die Meldung fehlt …" }
```

**Access.** Writing works without authentication — the project collects
anonymously. Abuse protection: a cap of 12 reports per hour and sender (a check
value derived from the IP address) plus moderation in the admin area. A
configured `REPORT_TOKEN` marks trusted clients such as the shortcut and raises
the cap to 40 per hour, which matters because a household shares one address. A
supplied but wrong token is rejected with `401`.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/reports` | Submit a report |
| `GET` | `/api/v1/reports` | Public reports (`limit`, `hours`) |
| `GET` | `/api/v1/situation` | Metrics, assessment, latest reports (`limit`) |
| `GET` | `/api/v1/streets` | Streets with the most reports (`days`, `limit`) |
| `GET` | `/api/v1/addresses` | Resolve an address to coordinates (`q`) |
| `GET` | `/api/v1/meta` | Allowed values, limits, error codes |
| `GET` | `/api/v1/openapi` | OpenAPI description |

### Submitting a report

`POST /api/v1/reports`

Accepts JSON, form data or a query string in the body — shortcuts occasionally
send JSON without a matching `Content-Type` header, which is handled.

| Field | Type | Required | Note |
| --- | --- | --- | --- |
| `severity` | 1–5 | yes | Reported odor strength |
| `latitude` | number | yes¹ | WGS84 |
| `longitude` | number | yes¹ | WGS84 |
| `address` | string | yes¹ | Instead of coordinates; resolved server-side |
| `odorType` | string | no | `rotten`, `blood`, `manure`, `burnt`, `chemical`, `sweet`, `other` |
| `duration` | string | no | `short`, `persistent`, `recurring` |
| `comment` | string | no | max. 500 characters |
| `reportedAt` | ISO-8601 | no | at most 24 hours in the past |

¹ Either coordinates **or** `address`. Coordinates take precedence.

**Headers**

```
Content-Type: application/json
X-Report-Token: <REPORT_TOKEN>      # optional
Idempotency-Key: <your own id>      # optional, prevents duplicates
```

Sending the same `Idempotency-Key` again creates no second report: the response
returns the existing one with `duplicate: true` and status `200` instead of
`201`. The frontend uses this automatically so a second tap on a flaky
connection does not file a duplicate.

**Example**

```bash
curl -X POST https://example.org/api/v1/reports \
  -H "Content-Type: application/json" \
  -H "X-Report-Token: secret" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"severity":4,"latitude":48.1258,"longitude":11.5528}'
```

**Response** (`201`)

```json
{
  "ok": true,
  "message": "Meldung gespeichert: 4 · Stark · 10:34 Uhr · Zenettistraße · Wind Südwest · 12 km/h",
  "duplicate": false,
  "report": {
    "id": "c7k2mfdhma82",
    "reportedAt": "2026-09-12T08:34:11.902Z",
    "time": "10:34 Uhr",
    "severity": 4,
    "severityLabel": "Stark",
    "street": "Zenettistraße",
    "district": "Am Schlachthof",
    "city": "München",
    "odorType": null,
    "odorTypeLabel": null,
    "duration": null,
    "durationLabel": null,
    "wind": {
      "directionDeg": 228,
      "direction": "SW",
      "directionLabel": "Südwest",
      "speedKmh": 11.9,
      "label": "Südwest · 12 km/h"
    },
    "rain": false,
    "rainLabel": "Kein Regen",
    "precipitationMm": 0,
    "temperatureC": 17.2,
    "source": "shortcut"
  }
}
```

Every value comes twice: as a stable identifier for processing and as a German
string for display. House number and coordinates are never included.

### Error codes

| Code | Status | Meaning |
| --- | --- | --- |
| `unreadable_body` | 400 | Body was neither valid JSON nor form data |
| `severity_missing` | 400 | `severity` missing or outside 1–5 |
| `location_missing` | 400 | Neither coordinates nor `address` supplied |
| `address_not_found` | 422 | `address` could not be resolved |
| `too_many_reports` | 429 | Hourly cap for this sender reached |
| `unauthorized` | 401 | Supplied token does not match |
| `save_failed` | 500 | Database unavailable |

### CORS

Read endpoints are open to any origin. Writing is limited to the origin from
`BASE_URL`; add more in `API_CORS_ORIGINS`, comma separated (`*` opens it
fully). Both variables are read at runtime and can be changed without a rebuild
— `NEXT_PUBLIC_BASE_URL` only serves as a fallback, because that value is
written into the bundle at build time. The shortcut sends no `Origin` header and
is unaffected.

### Checking

```bash
./scripts/check-api.sh http://localhost:3000
```

The script walks every endpoint, checks the error cases, preflight requests and
idempotency, and prints a sample response. Pass a token as the second argument.

### Building the shortcut

1. **Choose from Menu** — entries `1 Kaum` through `5 Extrem`.
2. Variant A: **Get Current Location** → take latitude and longitude.
   Variant B: store the address as text and send it in the `address` field —
   then no coordinates are needed.
3. **Dictionary** with `severity` plus either `latitude`/`longitude` or `address`.
4. **Get Contents of URL** — method `POST`, request body `JSON`, add the
   `X-Report-Token` header.
5. **Show Notification** with the value of `message` — it fits both success and
   failure.

The finished shortcut is published at
<https://www.icloud.com/shortcuts/42f368d5edb34ff1aa619423c5cbcbfa> and the
`/kurzbefehl` page links to it directly. A fork that shares its own shortcut
sets `NEXT_PUBLIC_SHORTCUT_URL` to that link instead — note it is inlined at
build time, so on Docker it has to be passed as a build argument, not only as a
runtime variable.

---

## Operations

The app is an ordinary Next.js server with a SQLite file next to it. It runs on
any host with Node 20 or newer, in Docker or on a small VM. Platforms without a
persistent filesystem (classic serverless, for instance) need a different
database — see the note on `src/lib/db.ts`.

```bash
npm run build
NODE_ENV=production npm run start
```

A regular backup of the file under `data/` preserves every report.

---

## Accessibility and design

- Every control is keyboard reachable; the severity picker responds to arrow keys.
- Severity is never conveyed by colour alone — number, label and a bar meter
  carry it as well.
- `prefers-reduced-motion` is respected.
- Body text on phones stays at 16 px or larger.
