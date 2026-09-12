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
| `REPORT_TOKEN` | deprecated | Shared secret of the old shortcut setup. Keep it set until the last shortcut has been switched over. |
| `CLIENT_TOKEN_SECRET` | recommended | Key material for device tokens and challenges. Falls back to `REPORTER_SALT`. Changing it invalidates every issued token. |
| `REPORTER_SALT` | recommended | Salt for the reporter check value used for abuse protection. |
| `TRUSTED_PROXY_HOPS` | no | Proxies in front of the app whose `X-Forwarded-For` entries may be trusted. Railway: `1`. Default `1`. |
| `CLIENT_IP_HEADER` | no | Alternative single header carrying the verified address, e.g. `cf-connecting-ip`. |
| `POW_RANGE` | no | Search space for the enrollment challenge. Default `30000`. |
| `SURGE_FLOOR` | no | Reports per hour below which nothing counts as a surge. Default `40`. |
| `SURGE_FACTOR` | no | Multiple of the usual hour that trips the brake. Default `4`. |
| `DATABASE_PATH` | no | Path to the SQLite file. Default: `./data/bye-schlachthof.db`. |
| `BASE_URL` | for production | Public address, read at runtime. Drives the CORS allowance for writes. |
| `API_CORS_ORIGINS` | no | Additional origins allowed to write, comma separated. `*` opens it fully. |
| `NEXT_PUBLIC_BASE_URL` | for production | Public address for metadata and the shortcut page. Inlined at build time. |
| `NEXT_PUBLIC_SHORTCUT_URL` | no | iCloud link of the finished shortcut. When set, the install button appears. |

---

## Layout

```
assets/           Source files, not served
src/
  app/            Pages (App Router) and API routes
    api/v1/       reports, clients, situation, streets, addresses, meta, openapi
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

**Access.** Writing works without an account — the project collects
anonymously, and that does not change. What it does have is a token per
installation: enough to give a quota somebody to follow and to lock out a
single sender, without ever asking who that sender is. See
[Abuse protection](#abuse-protection) for the whole arrangement.

| Sender | Reports/hour | Reports/day |
| --- | --- | --- |
| Without a token | 5 | 15 |
| Enrolled browser | 12 | 40 |
| Enrolled shortcut | 40 | 120 |
| Ceiling per address | 60 | 200 |

Over the quota is `429`. An unknown token is `401`, a revoked one `403`.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/clients/challenge` | Fetch a challenge for enrollment |
| `POST` | `/api/v1/clients` | Enrol a device and receive a token |
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
X-Client-Token: <device token>      # optional, raises the quota
Idempotency-Key: <your own id>      # optional, prevents duplicates
X-Report-Token: <REPORT_TOKEN>      # deprecated, see Abuse protection
```

Sending the same `Idempotency-Key` again creates no second report: the response
returns the existing one with `duplicate: true` and status `200` instead of
`201`. The frontend uses this automatically so a second tap on a flaky
connection does not file a duplicate.

**Example**

```bash
curl -X POST https://example.org/api/v1/reports \
  -H "Content-Type: application/json" \
  -H "X-Client-Token: bs1.7f3k9x2mq8ab.Xy4Zt0Q…" \
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
    "source": "shortcut",
    "status": "visible",
    "statusLabel": "Veröffentlicht"
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
| `location_out_of_area` | 422 | Location lies outside the Munich frame |
| `too_many_reports` | 429 | Quota for this device or address exhausted |
| `unauthorized` | 401 | Supplied token is unknown or malformed |
| `token_revoked` | 403 | This device has been locked out |
| `challenge_failed` | 400 | Enrollment task unsolved, expired or already spent |
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
   `X-Client-Token` header with the token from `/kurzbefehl`.
5. **Show Notification** with the value of `message` — it fits both success and
   failure.

Once the shortcut is finished and shared as an iCloud link, put that link into
`NEXT_PUBLIC_SHORTCUT_URL`. The `/kurzbefehl` page then shows the install button
instead of the placeholder note.

---

## Abuse protection

Nobody creates an account, and the write endpoint is documented at
`/api/v1/openapi` for anyone to find. The measures below therefore assume a
caller who has read all of this and is not a browser.

The attack worth designing against is not volume for its own sake. It is a
steady stream of plausible reports — a hundred quiet severity-1 entries from
across the district — meant to pull the averages down and let somebody argue
the data is unreliable. Volume is cheap to survive; a set of public figures
that cannot be defended afterwards is not.

### Who is sending

**Devices enrol themselves.** `POST /api/v1/clients` issues a token for one
installation in exchange for a solved challenge. No account, no mail address,
no name — the token records only that somebody did the work once. The website
enrols in the background while the form is being filled in, so a visitor
notices nothing. The shortcut gets its token from a button on `/kurzbefehl`,
because the Kurzbefehle app cannot compute a hash itself and so cannot solve
the challenge on its own.

The point is not that a token is hard to obtain. It is that quotas can follow
a device instead of the address it happens to be sending from, and that one
sender can be locked out without everyone else being re-equipped. That was the
flaw in the shared `REPORT_TOKEN`: every shortcut carried the same copy,
readable by anyone who opened it, revocable only for all of them at once. It
keeps working during the migration and should be removed afterwards.

**The challenge** is signed rather than stored, and each solution is spent
exactly once, so one piece of work cannot mint a supply of tokens. Being
self-hosted, it puts no third party between the visitor and the site — which
keeps the privacy statement as short as it is.

Do not mistake it for a wall. Native code hashes far faster than a browser,
and a determined caller will still get tokens. What bounds the supply is the
cap of five enrollments per address per day; the work only makes each one cost
something.

### How much is arriving

Quotas apply per token and per address, hourly and daily — the table is under
[API](#api). The address ceiling sits above the device quotas rather
than replacing them, because a household has several devices and one
connection.

**The surge brake** is the measure that still helps if everything above is
defeated. Once an hour runs past `SURGE_FACTOR` times the median of the last
fortnight, and never below `SURGE_FLOOR`, reports from senders without a
history stop being published directly: they are stored, they are counted, and
they wait in the admin area. A device that has been around a day with three
reports behind it publishes straight through, and the sender is told plainly
that the report is under review rather than left to assume otherwise. The
worst case is then a moderation queue instead of public figures nobody can
defend.

### What the figures are built on

Public counts and averages use one entry per sender and hour, at the highest
severity of that hour. Pressing the button ten times counts once; ten
neighbours count ten times. The street figures keep the street in the key, so
one sender counts once per street and hour.

This is deliberately independent of the street for the overall counts: the
street is filled in asynchronously, and keyed on it a burst arriving faster
than the lookups would slip through while the rows still said nothing about
where they came from.

### The rest

- **Only Munich.** Coordinates outside the frame in `src/lib/geo.ts` are
  rejected with `location_out_of_area`, which costs local reporters nothing
  and makes flooding from anywhere else pointless.
- **Quota before geocoding.** A sender over their limit never triggers a
  Nominatim lookup — that is the reliable way to get the server blocked by
  OSM.
- **The address the limit is keyed on.** `X-Forwarded-For` is a list every
  proxy appends to, so the trusted entry is the rightmost, not the first.
  `TRUSTED_PROXY_HOPS` says how many proxies stand in front; setting it too
  high lets senders fake their address. IPv6 is reduced to its /64, so the
  addresses inside one customer allocation cannot be rotated for a fresh
  quota.
- **Revoking.** The admin area lists the enrolled devices — a public id, the
  day it was enrolled, the number of reports. Locking one out offers to hide
  everything it ever sent in the same step.
- **CORS is not a defence.** It restricts browsers. `curl` sends no `Origin`
  and is unaffected. It is there to stop other sites posting on a visitor's
  behalf, nothing more.

### Data protection

A device token is pseudonymous and stored, so it belongs in the privacy
statement — but it identifies less than the address check value already kept
alongside every report. Reporting without a token stays possible, and the
tighter quota is the only consequence.

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
