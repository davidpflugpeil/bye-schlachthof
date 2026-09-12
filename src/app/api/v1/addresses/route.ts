import { optionsResponse, success } from "@/lib/api";
import { searchAddress } from "@/lib/geo";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return optionsResponse(request, "read");
}

/**
 * Address lookup for the location picker in the frontend.
 * Returns coordinates that can then be used to submit a report.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 3) {
    return success({ count: 0, matches: [] }, { request, access: "read" });
  }

  const matches = await searchAddress(query);
  return success(
    { count: matches.length, matches },
    { request, access: "read", headers: { "Cache-Control": "private, max-age=60" } },
  );
}
