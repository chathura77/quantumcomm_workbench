import { handleValidatedJsonPost } from "@/lib/security/api";
import { runAttackModel } from "@/lib/qkd/attacks";
import { attackInputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  return handleValidatedJsonPost(request, {
    routeId: "simulations.qkd.attack",
    schema: attackInputSchema,
    handler: runAttackModel,
    rateLimit: { limit: 60, windowMs: 60_000 }
  });
}
