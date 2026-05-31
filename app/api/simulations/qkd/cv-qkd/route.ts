import { handleValidatedJsonPost } from "@/lib/security/api";
import { estimateCvQkd } from "@/lib/qkd/cvQkd";
import { cvQkdInputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  return handleValidatedJsonPost(request, {
    routeId: "simulations.qkd.cv-qkd",
    schema: cvQkdInputSchema,
    handler: estimateCvQkd
  });
}
