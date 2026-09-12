import { optionsResponse, success } from "@/lib/api";
import { issueChallenge } from "@/lib/pow";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return optionsResponse(request, "write");
}

/**
 * Hands out a task that has to be solved before a token is issued. Costs the
 * server one hash, costs the client a moment of computation — which is the
 * whole point.
 */
export async function GET(request: Request) {
  return success(
    {
      message: "Bitte löse die Aufgabe, um den Kurzbefehl freizuschalten.",
      challenge: issueChallenge(),
    },
    { request, access: "write", headers: { "Cache-Control": "no-store" } },
  );
}
