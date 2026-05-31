import { handleValidatedJsonPost } from "@/lib/security/api";
import { estimateMdiQkd } from "@/lib/qkd/mdiQkd";
import { mdiQkdInputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  return handleValidatedJsonPost(request, {
    routeId: "simulations.qkd.mdi-qkd",
    schema: mdiQkdInputSchema,
    handler: estimateMdiQkd
  });
}
