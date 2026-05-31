import { handleValidatedJsonPost } from "@/lib/security/api";
import { optimizeRepeaterChain } from "@/lib/network/repeater";
import { repeaterOptimizeInputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  return handleValidatedJsonPost(request, {
    routeId: "simulations.network.repeater-optimize",
    schema: repeaterOptimizeInputSchema,
    handler: optimizeRepeaterChain
  });
}
