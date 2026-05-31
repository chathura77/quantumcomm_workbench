import { handleValidatedJsonPost } from "@/lib/security/api";
import { estimateFiniteKeyBb84 } from "@/lib/qkd/finiteKeyBb84";
import { finiteKeyBb84InputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  return handleValidatedJsonPost(request, {
    routeId: "simulations.qkd.finite-key-bb84",
    schema: finiteKeyBb84InputSchema,
    handler: estimateFiniteKeyBb84
  });
}
