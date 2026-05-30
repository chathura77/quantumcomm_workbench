import { NextResponse } from "next/server";
import { runAttackModel } from "@/lib/qkd/attacks";
import { attackInputSchema, validationErrorResponse } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = attackInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
  }
  return NextResponse.json(runAttackModel(parsed.data));
}
