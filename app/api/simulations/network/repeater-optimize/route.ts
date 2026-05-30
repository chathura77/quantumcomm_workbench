import { NextResponse } from "next/server";
import { optimizeRepeaterChain } from "@/lib/network/repeater";
import { repeaterOptimizeInputSchema, validationErrorResponse } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = repeaterOptimizeInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
  }
  return NextResponse.json(optimizeRepeaterChain(parsed.data));
}
