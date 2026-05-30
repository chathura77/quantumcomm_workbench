import { NextResponse } from "next/server";
import { estimateMdiQkd } from "@/lib/qkd/mdiQkd";
import { mdiQkdInputSchema, validationErrorResponse } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = mdiQkdInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
  }

  return NextResponse.json(estimateMdiQkd(parsed.data));
}
