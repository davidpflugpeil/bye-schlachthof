import { NextResponse } from "next/server";

import { totalReportCount } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness and readiness probe for the hosting platform.
 *
 * Touches the database on purpose: a process that is up but cannot reach its
 * volume is not healthy, and a restart is the right answer.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    const reports = totalReportCount();
    return NextResponse.json(
      {
        ok: true,
        status: "healthy",
        database: "reachable",
        reports,
        latencyMs: Date.now() - startedAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        database: "unreachable",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
