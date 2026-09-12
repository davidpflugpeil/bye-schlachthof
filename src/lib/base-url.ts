/**
 * Resolves the public address of this deployment.
 *
 * Order of preference:
 *   1. `BASE_URL` / `NEXT_PUBLIC_BASE_URL` when explicitly configured
 *   2. Vercel's own system variables, which every deployment gets for free
 *   3. localhost, for development
 *
 * Deriving it from step 2 means a Vercel deployment needs no manual URL
 * configuration at all — and an empty string can no longer slip through and
 * blow up `new URL()`, which is how an earlier production build failed.
 */
export function baseUrl(): string {
  const explicit =
    process.env.BASE_URL?.trim() || process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (explicit) return normalize(explicit);

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercelHost) return normalize(vercelHost);

  return "http://localhost:3000";
}

/** Vercel supplies bare hostnames; local configuration usually carries a scheme. */
function normalize(value: string): string {
  const withScheme = /^https?:\/\//.test(value) ? value : `https://${value}`;
  return withScheme.replace(/\/+$/, "");
}
