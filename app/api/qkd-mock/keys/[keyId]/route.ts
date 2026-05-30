import { NextResponse } from "next/server";
import { retrieveMockKey } from "@/lib/standards/etsiMock";

export async function GET(_: Request, { params }: { params: Promise<{ keyId: string }> }) {
  const { keyId } = await params;
  const result = retrieveMockKey(keyId);
  return NextResponse.json(result.body, { status: result.ok ? 200 : 404 });
}
