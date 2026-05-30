import { NextResponse } from "next/server";
import { requestMockKeys } from "@/lib/standards/etsiMock";
import { validationErrorResponse } from "@/lib/validation/schemas";
import { ZodError } from "zod";

export async function POST(request: Request) {
  const result = requestMockKeys(await request.json());
  if (!result.ok && result.status === 400 && result.body instanceof ZodError) {
    return NextResponse.json(validationErrorResponse(result.body), { status: 400 });
  }
  return NextResponse.json(result.body, { status: result.status });
}
