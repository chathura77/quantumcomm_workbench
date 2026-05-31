import { readJsonRequest, rateLimitResponse, secureJson } from "@/lib/security/api";
import { parseMockAuthorizationHeaders, requestMockKeys } from "@/lib/standards/etsiMock";
import { validationErrorResponse } from "@/lib/validation/schemas";
import { ZodError } from "zod";

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, {
    routeId: "qkd-mock.keys.request",
    limit: 30,
    windowMs: 60_000
  });
  if (limited) return limited;

  const json = await readJsonRequest(request);
  if (!json.ok) return json.response;

  const result = requestMockKeys(json.value, parseMockAuthorizationHeaders(request.headers));
  if (!result.ok && result.status === 400 && result.body instanceof ZodError) {
    return secureJson(validationErrorResponse(result.body), { status: 400 });
  }
  return secureJson(result.body, { status: result.status });
}
