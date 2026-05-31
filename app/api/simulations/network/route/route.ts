import { handleValidatedJsonPost } from "@/lib/security/api";
import { rankRoutes } from "@/lib/network/routing";
import { routeInputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  return handleValidatedJsonPost(request, {
    routeId: "simulations.network.route",
    schema: routeInputSchema,
    handler: rankRoutes,
    bodyLimitBytes: 256 * 1024,
    rateLimit: { limit: 60, windowMs: 60_000 }
  });
}
