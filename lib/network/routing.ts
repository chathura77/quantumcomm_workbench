import { dbToLinear, EPSILON, round } from "@/lib/math";
import type { ModelWarning, QuantumLink, QuantumNetworkScenario, SimulationResponse } from "@/lib/types";

export const ROUTING_VERSION = "entanglement-routing.simplified.v1";

export type RouteObjective = "rate" | "fidelity" | "latency" | "balanced";

export type RouteInput = {
  scenario: QuantumNetworkScenario;
  sourceNodeId: string;
  targetNodeId: string;
  objective: RouteObjective;
};

export type RankedRoute = {
  nodePath: string[];
  linkIds: string[];
  hopCount: number;
  totalLengthKm: number;
  successProbability: number;
  fidelity: number;
  latencyMs: number;
  rateProxyHz: number;
  score: number;
  warnings: ModelWarning[];
};

function linkSuccess(link: QuantumLink): number {
  if (typeof link.successProbability === "number") return link.successProbability;
  const lossDb = typeof link.lossDb === "number" ? link.lossDb : (link.attenuationDbPerKm ?? 0.2) * link.lengthKm;
  return dbToLinear(lossDb);
}

function wernerSwap(f1: number, f2: number): number {
  return f1 * f2 + ((1 - f1) * (1 - f2)) / 3;
}

function scoreRoute(route: Omit<RankedRoute, "score">, objective: RouteObjective): number {
  if (objective === "rate") return Math.log(route.rateProxyHz + EPSILON);
  if (objective === "fidelity") return route.fidelity;
  if (objective === "latency") return -route.latencyMs;
  return Math.log(route.rateProxyHz + EPSILON) + 2 * route.fidelity - 0.01 * route.latencyMs;
}

export function rankRoutes(input: RouteInput): SimulationResponse<RouteInput, { routes: RankedRoute[]; warnings: ModelWarning[] }> {
  const adjacency = new Map<string, QuantumLink[]>();
  for (const node of input.scenario.nodes) adjacency.set(node.id, []);
  for (const link of input.scenario.links) {
    adjacency.get(link.source)?.push(link);
    adjacency.get(link.target)?.push({ ...link, source: link.target, target: link.source });
  }

  const paths: QuantumLink[][] = [];
  const dfs = (nodeId: string, targetId: string, visited: Set<string>, path: QuantumLink[]) => {
    if (paths.length >= 20 || path.length > 8) return;
    if (nodeId === targetId) {
      paths.push(path);
      return;
    }
    for (const link of adjacency.get(nodeId) ?? []) {
      if (visited.has(link.target)) continue;
      visited.add(link.target);
      dfs(link.target, targetId, visited, [...path, link]);
      visited.delete(link.target);
    }
  };
  dfs(input.sourceNodeId, input.targetNodeId, new Set([input.sourceNodeId]), []);

  const globalWarnings: ModelWarning[] = [];
  if (paths.length === 0) {
    globalWarnings.push({
      code: "no-route",
      severity: "warning",
      message: "No connected route exists between the selected source and target."
    });
  }

  const nodeMemory = new Map(input.scenario.nodes.map((node) => [node.id, node.memoryLifetimeMs]));
  const routes = paths.map((path) => {
    const nodePath = [input.sourceNodeId, ...path.map((link) => link.target)];
    const successProbability = path.reduce((product, link) => product * linkSuccess(link), 1);
    const fidelity = path.reduce((current, link, index) => {
      const linkFidelity = link.fidelity ?? 0.95;
      return index === 0 ? linkFidelity : wernerSwap(current, linkFidelity);
    }, 1);
    const latencyMs = path.reduce((sum, link) => sum + (link.classicalLatencyMs ?? link.lengthKm / 200), 0);
    const totalLengthKm = path.reduce((sum, link) => sum + link.lengthKm, 0);
    const routeWarnings: ModelWarning[] = [];
    const lifetimes = nodePath.map((nodeId) => nodeMemory.get(nodeId)).filter((value): value is number => typeof value === "number");
    if (lifetimes.length > 0 && latencyMs > Math.min(...lifetimes)) {
      routeWarnings.push({
        code: "memory-lifetime",
        severity: "warning",
        message: "Path latency exceeds at least one node memory lifetime in the simplified model."
      });
    }
    const routeBase = {
      nodePath,
      linkIds: path.map((link) => link.id),
      hopCount: path.length,
      totalLengthKm: round(totalLengthKm, 4),
      successProbability,
      fidelity,
      latencyMs,
      rateProxyHz: 1000 * successProbability,
      warnings: routeWarnings
    };
    return {
      ...routeBase,
      score: scoreRoute(routeBase, input.objective)
    };
  }).sort((a, b) => b.score - a.score);

  return {
    input,
    result: {
      routes,
      warnings: globalWarnings
    },
    assumptions: [
      "Links are treated as undirected for MVP route discovery.",
      "End-to-end success is the product of link success probabilities.",
      "Fidelity uses a Werner-state swapping proxy."
    ],
    warnings: globalWarnings,
    version: ROUTING_VERSION
  };
}
