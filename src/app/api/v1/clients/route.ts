import { failure, optionsResponse, readBody, success } from "@/lib/api";
import { ENROLLMENTS_PER_DAY, mintToken } from "@/lib/clients";
import { reporterHash } from "@/lib/create-report";
import { claimChallenge, clientCountFromReporter } from "@/lib/db";
import { verifySolution } from "@/lib/pow";
import type { ClientKind } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return optionsResponse(request, "write");
}

/**
 * Issues an anonymous device token in exchange for a solved challenge.
 *
 * No account, no address, no name — the token only records that somebody did
 * the work once. The website fetches one in the background, the shortcut is
 * set up with one by hand.
 */
export async function POST(request: Request) {
  const options = { request, access: "write" as const };

  const body = await readBody(request);
  if (!body) {
    return failure(
      "unreadable_body",
      "Die Anfrage konnte nicht gelesen werden. Bitte lade die Seite neu.",
      options,
    );
  }

  const solution = verifySolution(body);
  if (!solution.ok) {
    return failure(
      "challenge_failed",
      solution.reason === "expired"
        ? "Die Aufgabe ist abgelaufen. Bitte lade die Seite neu."
        : "Die Aufgabe wurde nicht korrekt gelöst. Bitte lade die Seite neu.",
      options,
    );
  }

  // One solution, one token — otherwise a single piece of work could be
  // replayed for as many tokens as somebody likes.
  if (!claimChallenge(solution.signature, new Date(solution.expires).toISOString())) {
    return failure(
      "challenge_failed",
      "Diese Aufgabe wurde bereits verwendet. Bitte lade die Seite neu.",
      options,
    );
  }

  // The proof of work makes a token cost something; this caps how many can be
  // collected from one address no matter how cheap the computation gets.
  const reporter = reporterHash(request);
  if (clientCountFromReporter(reporter, 24 * 60) >= ENROLLMENTS_PER_DAY) {
    return failure(
      "too_many_reports",
      "Von diesem Anschluss wurden heute bereits mehrere Geräte eingerichtet. Bitte versuche es morgen noch einmal.",
      options,
    );
  }

  const kind: ClientKind = body.kind === "shortcut" ? "shortcut" : "web";
  const { token, client } = mintToken(kind, reporter);

  return success(
    {
      message:
        kind === "shortcut"
          ? "Token erstellt. Trage es im Kurzbefehl als Kopfzeile „X-Client-Token“ ein."
          : "Gerät freigeschaltet.",
      token,
      client: { publicId: client.publicId, kind: client.kind, createdAt: client.createdAt },
    },
    { ...options, status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
