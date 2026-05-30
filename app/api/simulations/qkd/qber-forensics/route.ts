import { NextResponse } from "next/server";
import { analyzeQber } from "@/lib/qkd/qber";
import { qberForensicsInputSchema, validationErrorResponse } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = qberForensicsInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
  }
  return NextResponse.json(analyzeQber(parsed.data));
}
