import { quantumNetworkScenarioSchema } from "@/lib/validation/schemas";
import type { ModelWarning, QuantumNetworkScenario } from "@/lib/types";

export const SCENARIO_FORMAT_VERSION = "quantum-network-scenario.schema.v1";

export function validateScenario(input: unknown): { ok: true; scenario: QuantumNetworkScenario; warnings: ModelWarning[] } | { ok: false; errors: string[] } {
  const parsed = quantumNetworkScenarioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "scenario"}: ${issue.message}`) };
  }
  const warnings: ModelWarning[] = [];
  const nodeIds = new Set(parsed.data.nodes.map((node) => node.id));
  for (const link of parsed.data.links) {
    if (!nodeIds.has(link.source) || !nodeIds.has(link.target)) {
      warnings.push({
        code: "dangling-link",
        severity: "critical",
        message: `Link ${link.id} references a missing node.`
      });
    }
  }
  const trustedNodes = parsed.data.nodes.filter((node) => node.type === "trusted_node");
  if (trustedNodes.length > 0) {
    warnings.push({
      code: "trusted-node-assumption",
      severity: "info",
      message: "Trusted-node scenarios assume intermediate key relay nodes are physically and operationally trusted."
    });
  }
  return { ok: true, scenario: parsed.data as QuantumNetworkScenario, warnings };
}

export function exportScenario(scenario: QuantumNetworkScenario): string {
  return JSON.stringify(scenario, null, 2);
}

export function importScenario(text: string) {
  try {
    return validateScenario(JSON.parse(text));
  } catch {
    return { ok: false as const, errors: ["Scenario JSON could not be parsed."] };
  }
}
