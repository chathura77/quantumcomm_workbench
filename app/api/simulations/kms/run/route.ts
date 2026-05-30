import { NextResponse } from "next/server";
import { runKmsSimulation } from "@/lib/kms/simulator";
import { kmsSimulationInputSchema, validationErrorResponse } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = kmsSimulationInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
  }
  return NextResponse.json(runKmsSimulation(parsed.data));
}
