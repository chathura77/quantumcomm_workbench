import { NextResponse } from "next/server";
import { parseMockAuthorizationHeaders, retrieveMockKey } from "@/lib/standards/etsiMock";

export async function GET(request: Request, { params }: { params: Promise<{ keyId: string }> }) {
  const { keyId } = await params;
  const result = retrieveMockKey(keyId, parseMockAuthorizationHeaders(request.headers));
  return NextResponse.json(result.body, { status: result.status });
}
