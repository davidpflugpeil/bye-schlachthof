import { API_VERSION, ERROR_CODES, TOKEN_HEADER, optionsResponse, success } from "@/lib/api";
import { DURATIONS, ODOR_TYPES, SEVERITY_LEVELS } from "@/lib/format";
import {
  BACKDATE_HOURS,
  COMMENT_MAX_LENGTH,
  REPORTS_PER_HOUR,
  REPORTS_PER_HOUR_WITH_TOKEN,
} from "@/lib/create-report";

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
      },
      token: {
        /** Reporting works without a token — the project collects anonymously. */
        required: false,
        active: Boolean(process.env.REPORT_TOKEN?.trim()),
        header: TOKEN_HEADER,
      },
      errorCodes: ERROR_CODES,
    },
    { request, access: "read", headers: { "Cache-Control": "public, max-age=600" } },
  );
}
