import "server-only";

import crypto from "node:crypto";

import { clientByPublicId, createClient, newPublicId } from "./db";
import type { ClientKind, ReportingClient } from "./types";

/**
 * Anonymous device tokens.
 *
 * A token stands for one installation, not for a person: no account, no mail
 * address, no name. It exists so a quota can follow the device instead of the
 * address it happens to be sending from, and so a single abuser can be
 * revoked without everyone else having to be re-equipped.
 *
 * That is the difference to the shared REPORT_TOKEN, which every shortcut
 * carried the same copy of — visible to anyone who opened the shortcut, and
 * only revocable for all of them at once.
 */

const PREFIX = "bs1";
const SEPARATOR = ".";

/**
 * Tokens one address may collect per day. A household sets up a handful of
 * devices; anything beyond that is somebody building a supply.
 */
export const ENROLLMENTS_PER_DAY = 5;

/** How long a client counts as new; see `isEstablished`. */
const SETTLING_HOURS = 24;
/** Reports a client has to have behind it before it counts as established. */
const SETTLING_REPORTS = 3;

function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export interface MintedToken {
  token: string;
  client: ReportingClient;
}

export function mintToken(kind: ClientKind, reporterHash: string | null): MintedToken {
  const publicId = newPublicId();
  const secret = crypto.randomBytes(24).toString("base64url");

  const client = createClient({
    publicId,
    secretHash: hashSecret(secret),
    kind,
    reporterHash,
  });

  return { token: [PREFIX, publicId, secret].join(SEPARATOR), client };
}

export type TokenCheck =
  | { state: "none" }
  | { state: "invalid" }
  | { state: "revoked" }
  | { state: "valid"; client: ReportingClient };

export function verifyClientToken(raw: string | null | undefined): TokenCheck {
  const token = raw?.trim();
  if (!token) return { state: "none" };

  const parts = token.split(SEPARATOR);
  if (parts.length !== 3 || parts[0] !== PREFIX) return { state: "invalid" };

  const [, publicId, secret] = parts;
  if (!publicId || !secret) return { state: "invalid" };

  const stored = clientByPublicId(publicId);
  if (!stored) return { state: "invalid" };

  if (!timingSafeEqual(hashSecret(secret), stored.secretHash)) return { state: "invalid" };
  if (stored.status === "revoked") return { state: "revoked" };

  const { secretHash: _secretHash, ...client } = stored;
  return { state: "valid", client };
}

/**
 * A client that has been around for a day and reported a few times. Used by
 * the surge brake: during a flood these keep publishing directly, while
 * everything freshly enrolled waits for a look from the admin area.
 */
export function isEstablished(client: ReportingClient): boolean {
  if (client.reportCount < SETTLING_REPORTS) return false;
  const age = Date.now() - new Date(`${client.createdAt.replace(" ", "T")}Z`).getTime();
  return Number.isFinite(age) && age >= SETTLING_HOURS * 3600_000;
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}
