import { rateLimitResponse, secureJson } from "@/lib/security/api";
import { getKeyPoolStatus } from "@/lib/standards/etsiMock";

export async function GET(request?: Request) {
  const limited = rateLimitResponse(request, {
    routeId: "qkd-mock.status",
    limit: 120,
    windowMs: 60_000
  });
  if (limited) return limited;

  return secureJson(getKeyPoolStatus());
}
