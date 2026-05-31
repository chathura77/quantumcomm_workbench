import { handleValidatedJsonPost } from "@/lib/security/api";
import { analyzeQber } from "@/lib/qkd/qber";
import { qberForensicsInputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  return handleValidatedJsonPost(request, {
    routeId: "simulations.qkd.qber-forensics",
    schema: qberForensicsInputSchema,
    handler: analyzeQber
  });
}
