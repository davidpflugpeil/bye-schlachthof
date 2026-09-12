import "server-only";

import crypto from "node:crypto";

/**
 * Proof of work for enrollment.
 *
 * The server picks a secret number and publishes only its hash. Whoever wants
 * a token has to find the number by trying them in order — a second or two in
 * a browser, nothing a visitor notices while the form is being filled in, but
 * a cost that has to be paid again for every single token.
 *
 * Deliberately self-hosted: no third party sees the visitors, so the privacy
 * statement stays as short as it is.
 *
 * This raises the price of automation, it does not make it impossible —
 * native code hashes far faster than a browser. The enrollment cap per
 * address, the quotas per token and the surge brake carry the real load.
 */

/** Search space. Average effort is half of it. */
function range(): number {
  const configured = Number.parseInt(process.env.POW_RANGE ?? "", 10);
  return Number.isFinite(configured) && configured >= 1000 ? configured : 30_000;
}

const TTL_MS = 10 * 60_000;

function secret(): string {
  return (
    process.env.CLIENT_TOKEN_SECRET?.trim() ||
    process.env.REPORTER_SALT?.trim() ||
    "bye-schlachthof-default-salt"
  );
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sign(salt: string, challenge: string, expires: number): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${salt}:${challenge}:${expires}`)
    .digest("hex");
}

export interface Challenge {
  salt: string;
  /** Hash of salt plus the secret number. */
  challenge: string;
  maxNumber: number;
  expires: number;
  /** Ties the three values together so the server needs to store nothing. */
  signature: string;
}

export function issueChallenge(): Challenge {
  const maxNumber = range();
  const salt = crypto.randomBytes(12).toString("hex");
  const number = crypto.randomInt(0, maxNumber);
  const challenge = sha256(`${salt}${number}`);
  const expires = Date.now() + TTL_MS;

  return { salt, challenge, maxNumber, expires, signature: sign(salt, challenge, expires) };
}

export interface Solution {
  salt?: unknown;
  challenge?: unknown;
  number?: unknown;
  expires?: unknown;
  signature?: unknown;
}

export type SolutionCheck =
  | { ok: true; signature: string; expires: number }
  | { ok: false; reason: "malformed" | "signature" | "expired" | "wrong" };

/**
 * Checks a submitted solution. The caller still has to spend the signature
 * once via `claimChallenge`, otherwise one piece of work could mint any
 * number of tokens.
 */
export function verifySolution(input: Solution): SolutionCheck {
  const salt = typeof input.salt === "string" ? input.salt : "";
  const challenge = typeof input.challenge === "string" ? input.challenge : "";
  const signature = typeof input.signature === "string" ? input.signature : "";
  const expires = Number(input.expires);
  const number = Number(input.number);

  if (!salt || !challenge || !signature) return { ok: false, reason: "malformed" };
  if (!Number.isFinite(expires) || !Number.isInteger(number) || number < 0) {
    return { ok: false, reason: "malformed" };
  }

  if (!equal(signature, sign(salt, challenge, expires))) {
    return { ok: false, reason: "signature" };
  }

  if (Date.now() > expires) return { ok: false, reason: "expired" };

  if (!equal(challenge, sha256(`${salt}${number}`))) {
    return { ok: false, reason: "wrong" };
  }

  return { ok: true, signature, expires };
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}
