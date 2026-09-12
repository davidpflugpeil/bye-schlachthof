import { NextResponse } from "next/server";

import { CLIENT_TOKEN_HEADER, ERROR_CODES, TOKEN_HEADER, optionsResponse } from "@/lib/api";
import { DURATIONS, ODOR_TYPES } from "@/lib/format";
import { COMMENT_MAX_LENGTH } from "@/lib/create-report";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return optionsResponse(request, "read");
}

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string", description: "Public identifier of the report" },
    reportedAt: { type: "string", format: "date-time" },
    time: { type: "string", description: "German time of day", example: "10:34 Uhr" },
    severity: { type: "integer", minimum: 1, maximum: 5 },
    severityLabel: { type: "string", example: "Stark" },
    street: { type: ["string", "null"], description: "Street without house number" },
    district: { type: ["string", "null"] },
    city: { type: ["string", "null"] },
    odorType: { type: ["string", "null"], enum: [...ODOR_TYPES.map((o) => o.value), null] },
    odorTypeLabel: { type: ["string", "null"], example: "Faulig" },
    duration: { type: ["string", "null"], enum: [...DURATIONS.map((d) => d.value), null] },
    durationLabel: { type: ["string", "null"], example: "Kurz" },
    wind: {
      type: ["object", "null"],
      properties: {
        directionDeg: { type: ["number", "null"] },
        direction: { type: ["string", "null"], example: "SW" },
        directionLabel: { type: ["string", "null"], example: "Südwest" },
        speedKmh: { type: ["number", "null"] },
        label: { type: ["string", "null"], example: "Südwest · 12 km/h" },
      },
    },
    rain: { type: ["boolean", "null"] },
    rainLabel: { type: "string", example: "Kein Regen" },
    precipitationMm: { type: ["number", "null"] },
    temperatureC: { type: ["number", "null"] },
    source: { type: "string", enum: ["web", "shortcut"] },
    status: {
      type: "string",
      enum: ["visible", "pending"],
      description: "`pending` means the surge brake is holding the report back from the figures.",
    },
    statusLabel: { type: "string", example: "Veröffentlicht" },
  },
} as const;

const ERROR_SCHEMA = {
  type: "object",
  properties: {
    ok: { type: "boolean", enum: [false] },
    error: {
      type: "object",
      properties: {
        code: { type: "string", enum: ERROR_CODES },
        message: { type: "string", description: "German text for display" },
      },
    },
    message: { type: "string", description: "Same as error.message — for shortcuts" },
  },
} as const;

const CHALLENGE_SCHEMA = {
  type: "object",
  description: "Find the number whose SHA-256 hash, prefixed with the salt, equals `challenge`.",
  properties: {
    salt: { type: "string" },
    challenge: { type: "string", description: "sha256(salt + number) as hex" },
    maxNumber: { type: "integer", description: "Upper bound of the search space" },
    expires: { type: "integer", description: "Valid until, epoch milliseconds" },
    signature: { type: "string", description: "Send back unchanged" },
  },
} as const;

/** Machine-readable description of the API (OpenAPI 3.1). */
export async function GET(request: Request) {
  const base = new URL(request.url).origin;

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Bye Schlachthof – odor reports",
      version: "1.0.0",
      description:
        "API for submitting and reading odor reports. Used by the web frontend and the iPhone shortcut. Published fields include street and district, never the house number or coordinates. All human-readable strings are German.",
    },
    servers: [{ url: `${base}/api/v1` }],
    tags: [
      { name: "Reports", description: "Submitting and reading" },
      { name: "Situation", description: "Current state and aggregates" },
      { name: "Support", description: "Address lookup and self-description" },
    ],
    components: {
      securitySchemes: {
        ClientToken: {
          type: "apiKey",
          in: "header",
          name: CLIENT_TOKEN_HEADER,
          description:
            "Optional. Anonymous token for one installation, obtained from POST /clients. Raises the quota and can be revoked on its own. Reporting also works without one.",
        },
        ReportToken: {
          type: "apiKey",
          in: "header",
          name: TOKEN_HEADER,
          description:
            "Deprecated. Shared secret of the old shortcut setup — every installation carries the same copy, so it identifies nobody. Use ClientToken instead.",
        },
      },
      schemas: { Report: REPORT_SCHEMA, Error: ERROR_SCHEMA, Challenge: CHALLENGE_SCHEMA },
    },
    paths: {
      "/clients/challenge": {
        get: {
          tags: ["Support"],
          summary: "Fetch a challenge for enrollment",
          description:
            "Returns a task that has to be solved before a token is issued: find the number whose SHA-256 hash, prefixed with the salt, matches `challenge`. Costs a browser a second or two and has to be paid again for every token.",
          responses: {
            "200": {
              description: "Challenge",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean", enum: [true] },
                      challenge: { $ref: "#/components/schemas/Challenge" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/clients": {
        post: {
          tags: ["Support"],
          summary: "Enrol a device and receive a token",
          description:
            "Hands out an anonymous token for one installation in exchange for a solved challenge. No account, no address, no name. One solution mints one token, and an address may enrol a limited number per day.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["salt", "challenge", "number", "expires", "signature"],
                  properties: {
                    salt: { type: "string" },
                    challenge: { type: "string" },
                    number: { type: "integer", description: "The solution" },
                    expires: { type: "integer" },
                    signature: { type: "string" },
                    kind: { type: "string", enum: ["web", "shortcut"], default: "web" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Token issued",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean", enum: [true] },
                      message: { type: "string" },
                      token: {
                        type: "string",
                        description: "Send as the ClientToken header. Shown only once.",
                        example: "bs1.7f3k9x2mq8ab.Xy4Zt0Q…",
                      },
                      client: {
                        type: "object",
                        properties: {
                          publicId: { type: "string" },
                          kind: { type: "string", enum: ["web", "shortcut"] },
                          createdAt: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Challenge unsolved, expired or already spent",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
            "429": { description: "This address has enrolled enough devices today" },
          },
        },
      },
      "/reports": {
        post: {
          tags: ["Reports"],
          summary: "Submit an odor report",
          security: [{}, { ClientToken: [] }, { ReportToken: [] }],
          parameters: [
            {
              name: "Idempotency-Key",
              in: "header",
              required: false,
              schema: { type: "string", maxLength: 120 },
              description:
                "Sending the same key again does not create a second report; the existing one is returned.",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["severity"],
                  properties: {
                    severity: { type: "integer", minimum: 1, maximum: 5 },
                    latitude: { type: "number", example: 48.1258 },
                    longitude: { type: "number", example: 11.5528 },
                    address: {
                      type: "string",
                      description:
                        "Alternative to coordinates, resolved server-side. Handy for shortcuts with a fixed address.",
                      example: "Zenettistraße 12, München",
                    },
                    odorType: { type: "string", enum: ODOR_TYPES.map((o) => o.value) },
                    duration: { type: "string", enum: DURATIONS.map((d) => d.value) },
                    comment: { type: "string", maxLength: COMMENT_MAX_LENGTH },
                    reportedAt: {
                      type: "string",
                      format: "date-time",
                      description: "At most 24 hours in the past.",
                    },
                  },
                },
              },
              "application/x-www-form-urlencoded": {
                schema: {
                  type: "object",
                  required: ["severity"],
                  properties: {
                    severity: { type: "integer" },
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                    address: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Report stored",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean", enum: [true] },
                      message: {
                        type: "string",
                        description: "Ready-made German sentence for display",
                        example: "Meldung gespeichert: 4 · Stark · 10:34 Uhr · Zenettistraße",
                      },
                      duplicate: { type: "boolean" },
                      report: { $ref: "#/components/schemas/Report" },
                    },
                  },
                },
              },
            },
            "200": { description: "Request already known (Idempotency-Key)" },
            "400": {
              description: "Input incomplete",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
            "401": { description: "Token invalid or unknown" },
            "403": { description: "This device has been revoked" },
            "422": {
              description: "Address could not be resolved, or the location lies outside Munich",
            },
            "429": { description: "Quota for this device or address exhausted" },
          },
        },
        get: {
          tags: ["Reports"],
          summary: "Read public reports",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 200 } },
            { name: "hours", in: "query", schema: { type: "integer", default: 48, maximum: 2160 } },
          ],
          responses: {
            "200": {
              description: "Reports, newest first",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean" },
                      windowHours: { type: "integer" },
                      count: { type: "integer" },
                      reports: { type: "array", items: { $ref: "#/components/schemas/Report" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/situation": {
        get: {
          tags: ["Situation"],
          summary: "Current odor situation",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 6, maximum: 50 } },
          ],
          responses: { "200": { description: "Metrics, assessment and latest reports" } },
        },
      },
      "/streets": {
        get: {
          tags: ["Situation"],
          summary: "Streets with the most reports",
          parameters: [
            { name: "days", in: "query", schema: { type: "integer", default: 7, maximum: 365 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 8, maximum: 100 } },
          ],
          responses: { "200": { description: "Aggregate per street" } },
        },
      },
      "/addresses": {
        get: {
          tags: ["Support"],
          summary: "Resolve an address to coordinates",
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string", minLength: 3 } },
          ],
          responses: { "200": { description: "Matches with coordinates" } },
        },
      },
      "/meta": {
        get: {
          tags: ["Support"],
          summary: "Allowed values, limits and error codes",
          responses: { "200": { description: "Self-description of the API" } },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=600",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
