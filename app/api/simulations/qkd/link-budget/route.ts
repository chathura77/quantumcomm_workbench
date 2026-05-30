import { NextResponse } from "next/server";
import { computeLinkBudget } from "@/lib/qkd/linkBudget";
import { linkBudgetInputSchema, validationErrorResponse } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = linkBudgetInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
  }
  return NextResponse.json(computeLinkBudget(parsed.data));
}
