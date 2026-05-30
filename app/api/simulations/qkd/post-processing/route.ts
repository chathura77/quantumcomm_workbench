import { NextResponse } from "next/server";
import { estimatePostProcessing } from "@/lib/qkd/postProcessing";
import { postProcessingInputSchema, validationErrorResponse } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = postProcessingInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
  }
  return NextResponse.json(estimatePostProcessing(parsed.data));
}
