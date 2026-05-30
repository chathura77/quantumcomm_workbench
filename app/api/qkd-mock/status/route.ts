import { NextResponse } from "next/server";
import { getKeyPoolStatus } from "@/lib/standards/etsiMock";

export async function GET() {
  return NextResponse.json(getKeyPoolStatus());
}
