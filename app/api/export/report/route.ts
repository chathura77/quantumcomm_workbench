import { NextResponse } from "next/server";
import { buildRunReport } from "@/lib/export/report";
import { reportExportInputSchema, validationErrorResponse } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = reportExportInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
  }
  return NextResponse.json(buildRunReport(parsed.data));
}
