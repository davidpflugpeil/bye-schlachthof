import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "bye_schlachthof_admin";
const VALID_DAYS = 7;

/**
 * Key material for the session cookie signature.
 *
 * The admin password already carries most of the secrecy, so `ADMIN_SECRET`
 * is defence in depth: it keeps the signing key from being derived solely
 * from a password that may be weak. When it is not configured it falls back
 * to a hash of the database URL rather than a constant — a constant sitting
 * in a public repository is the one half an attacker would otherwise know.
 *
 * Changing either value invalidates all open admin sessions, which makes
 * rotating `ADMIN_SECRET` a convenient "sign everyone out" lever.
 */
function secret(): string | null {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) return null;

  const configured = process.env.ADMIN_SECRET?.trim();
  if (configured) return `${password}:${configured}`;

  const databaseUrl = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
  const derived = databaseUrl
    ? crypto.createHash("sha256").update(`admin-secret:${databaseUrl}`).digest("hex")
    : "bye-schlachthof-development";

  return `${password}:${derived}`;
}

export function adminEnabled(): boolean {
  return secret() !== null;
}

function sign(expiry: number, key: string): string {
  return crypto.createHmac("sha256", key).update(String(expiry)).digest("hex");
}

function equal(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

export function passwordMatches(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) return false;
  return equal(input.trim(), password);
}

export async function startSession(): Promise<void> {
  const key = secret();
  if (!key) return;

  const expiry = Date.now() + VALID_DAYS * 86_400_000;
  const store = await cookies();
  store.set(COOKIE_NAME, `${expiry}.${sign(expiry, key)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VALID_DAYS * 86_400,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isSignedIn(): Promise<boolean> {
  const key = secret();
  if (!key) return false;

  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return false;

  const [expiryText, signature] = value.split(".");
  const expiry = Number(expiryText);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  if (!signature) return false;

  return equal(signature, sign(expiry, key));
}
