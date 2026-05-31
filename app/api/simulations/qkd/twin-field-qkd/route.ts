import { handleValidatedJsonPost } from "@/lib/security/api";
import { estimateTwinFieldQkd } from "@/lib/qkd/twinFieldQkd";
import { twinFieldQkdInputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  return handleValidatedJsonPost(request, {
    routeId: "simulations.qkd.twin-field-qkd",
    schema: twinFieldQkdInputSchema,
    handler: estimateTwinFieldQkd
  });
}
