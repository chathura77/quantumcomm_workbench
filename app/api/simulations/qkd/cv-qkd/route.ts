import { NextResponse } from "next/server";
import { estimateCvQkd } from "@/lib/qkd/cvQkd";
import { cvQkdInputSchema, validationErrorResponse } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = cvQkdInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
  }

  return NextResponse.json(estimateCvQkd(parsed.data));
}
