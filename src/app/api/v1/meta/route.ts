import {
  API_VERSION,
  CLIENT_TOKEN_HEADER,
  ERROR_CODES,
  TOKEN_HEADER,
  optionsResponse,
  success,
} from "@/lib/api";
import { DURATIONS, ODOR_TYPES, SEVERITY_LEVELS } from "@/lib/format";
import {
  ADDRESS_QUOTA,
  BACKDATE_HOURS,
  COMMENT_MAX_LENGTH,
  QUOTAS,
  REPORTS_PER_HOUR,
  REPORTS_PER_HOUR_WITH_TOKEN,
} from "@/lib/create-report";
import { ENROLLMENTS_PER_DAY } from "@/lib/clients";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return optionsResponse(request, "read");
}

/**
 * Self-description of the API: allowed values and limits. A client can build
 * its pickers from this instead of hard-coding them.
 */
export async function GET(request: Request) {
  return success(
    {
      version: API_VERSION,
      severityLevels: SEVERITY_LEVELS,
      odorTypes: ODOR_TYPES,
      durations: DURATIONS,
      limits: {
        reportsPerHour: REPORTS_PER_HOUR,
        reportsPerHourWithToken: REPORTS_PER_HOUR_WITH_TOKEN,
        commentMaxLength: COMMENT_MAX_LENGTH,
        backdateHours: BACKDATE_HOURS,
        /** Per trust tier, plus the ceiling that applies to one address. */
        quotas: { ...QUOTAS, address: ADDRESS_QUOTA },
        enrollmentsPerDay: ENROLLMENTS_PER_DAY,
      },
      /**
       * Reporting works without a token — the project collects anonymously.
       * A device token only raises the quota and can be revoked on its own.
       */
      client: {
        required: false,
        header: CLIENT_TOKEN_HEADER,
        challengeEndpoint: "/api/v1/clients/challenge",
        enrollEndpoint: "/api/v1/clients",
        kinds: ["web", "shortcut"],
      },
      token: {
        /** The shared secret of the old shortcut setup, on its way out. */
        required: false,
        active: Boolean(process.env.REPORT_TOKEN?.trim()),
        header: TOKEN_HEADER,
        deprecated: true,
      },
      errorCodes: ERROR_CODES,
    },
    { request, access: "read", headers: { "Cache-Control": "public, max-age=600" } },
  );
}
