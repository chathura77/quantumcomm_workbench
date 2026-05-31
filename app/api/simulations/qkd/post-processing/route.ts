import { handleValidatedJsonPost } from "@/lib/security/api";
import { estimatePostProcessing } from "@/lib/qkd/postProcessing";
import { postProcessingInputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  return handleValidatedJsonPost(request, {
    routeId: "simulations.qkd.post-processing",
    schema: postProcessingInputSchema,
    handler: estimatePostProcessing
  });
}
