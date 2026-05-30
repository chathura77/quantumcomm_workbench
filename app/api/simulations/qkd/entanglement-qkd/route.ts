import { NextResponse } from "next/server";
import { estimateEntanglementQkd } from "@/lib/qkd/entanglementQkd";
import { entanglementQkdInputSchema, validationErrorResponse } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = entanglementQkdInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
  }

  return NextResponse.json(estimateEntanglementQkd(parsed.data));
}
