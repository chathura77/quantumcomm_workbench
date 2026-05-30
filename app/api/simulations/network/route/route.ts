import { NextResponse } from "next/server";
import { rankRoutes } from "@/lib/network/routing";
import { routeInputSchema, validationErrorResponse } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = routeInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
  }
  return NextResponse.json(rankRoutes(parsed.data));
}
