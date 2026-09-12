/**
 * Header names used by both sides. Kept out of `api.ts` because that module
 * is server-only and the browser needs these too.
 */

/** Shared secret of the old shortcut setup. Kept working during migration. */
export const TOKEN_HEADER = "X-Report-Token";

/** Per-installation token handed out by `POST /api/v1/clients`. */
export const CLIENT_TOKEN_HEADER = "X-Client-Token";
