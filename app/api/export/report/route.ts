import { buildRunReport } from "@/lib/export/report";
import { handleValidatedJsonPost, REPORT_JSON_BODY_LIMIT_BYTES } from "@/lib/security/api";
import { reportExportInputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  return handleValidatedJsonPost(request, {
    routeId: "export.report",
    schema: reportExportInputSchema,
    handler: buildRunReport,
    bodyLimitBytes: REPORT_JSON_BODY_LIMIT_BYTES,
    rateLimit: { limit: 60, windowMs: 60_000 }
  });
}
