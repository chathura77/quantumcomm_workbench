import { handleValidatedJsonPost } from "@/lib/security/api";
import { estimateEntanglementQkd } from "@/lib/qkd/entanglementQkd";
import { entanglementQkdInputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  return handleValidatedJsonPost(request, {
    routeId: "simulations.qkd.entanglement-qkd",
    schema: entanglementQkdInputSchema,
    handler: estimateEntanglementQkd
  });
}
