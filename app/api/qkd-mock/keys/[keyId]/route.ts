import { rateLimitResponse, secureJson } from "@/lib/security/api";
import { parseMockAuthorizationHeaders, retrieveMockKey } from "@/lib/standards/etsiMock";
import { keyIdSchema, validationErrorResponse } from "@/lib/validation/schemas";

export async function GET(request: Request, { params }: { params: Promise<{ keyId: string }> }) {
  const limited = rateLimitResponse(request, {
    routeId: "qkd-mock.keys.retrieve",
    limit: 60,
    windowMs: 60_000
  });
  if (limited) return limited;

  const { keyId } = await params;
  const parsedKeyId = keyIdSchema.safeParse(keyId);
  if (!parsedKeyId.success) {
    return secureJson(validationErrorResponse(parsedKeyId.error), { status: 400 });
  }
  const result = retrieveMockKey(parsedKeyId.data, parseMockAuthorizationHeaders(request.headers));
  return secureJson(result.body, { status: result.status });
}
