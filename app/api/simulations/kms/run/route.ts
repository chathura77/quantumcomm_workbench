import { handleValidatedJsonPost } from "@/lib/security/api";
import { runKmsSimulation } from "@/lib/kms/simulator";
import { kmsSimulationInputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  return handleValidatedJsonPost(request, {
    routeId: "simulations.kms.run",
    schema: kmsSimulationInputSchema,
    handler: runKmsSimulation,
    rateLimit: { limit: 60, windowMs: 60_000 }
  });
}
