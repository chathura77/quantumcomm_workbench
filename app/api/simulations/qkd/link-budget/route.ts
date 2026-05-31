import { handleValidatedJsonPost } from "@/lib/security/api";
import { computeLinkBudget } from "@/lib/qkd/linkBudget";
import { linkBudgetInputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  return handleValidatedJsonPost(request, {
    routeId: "simulations.qkd.link-budget",
    schema: linkBudgetInputSchema,
    handler: computeLinkBudget
  });
}
