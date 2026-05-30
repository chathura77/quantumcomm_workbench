import { NextResponse } from "next/server";
import { estimateTwinFieldQkd } from "@/lib/qkd/twinFieldQkd";
import { twinFieldQkdInputSchema, validationErrorResponse } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = twinFieldQkdInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
  }

  return NextResponse.json(estimateTwinFieldQkd(parsed.data));
}
