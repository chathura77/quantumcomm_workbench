import { NextResponse } from "next/server";
import { estimateFiniteKeyBb84 } from "@/lib/qkd/finiteKeyBb84";
import { finiteKeyBb84InputSchema, validationErrorResponse } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = finiteKeyBb84InputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
  }

  return NextResponse.json(estimateFiniteKeyBb84(parsed.data));
}
