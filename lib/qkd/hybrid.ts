export type HybridDecisionInput = {
  useCase: string;
  distanceKm: number;
  topology: "local" | "metro" | "long-haul" | "satellite";
  trustModel: "trusted-nodes-ok" | "avoid-trusted-nodes" | "software-only";
  keyRateNeed: "low" | "medium" | "high";
  availabilityNeed: "standard" | "high" | "mission-critical";
  budgetMaturity: "early" | "moderate" | "mature";
  complianceDriver: boolean;
};

export type HybridDecisionResult = {
  scorecard: Array<{ architecture: "PQC-only" | "QKD-only" | "Hybrid PQC + QKD"; score: number; rationale: string[] }>;
  recommendation: string;
  redFlags: string[];
};

export function decideHybridArchitecture(input: HybridDecisionInput): HybridDecisionResult {
  const scores = {
    "PQC-only": 60,
    "QKD-only": 35,
    "Hybrid PQC + QKD": 50
  };
  const rationale: Record<keyof typeof scores, string[]> = {
    "PQC-only": ["Software deployability and standards momentum are strong."],
    "QKD-only": ["Physical-layer key delivery can be useful in constrained links but needs specialized infrastructure."],
    "Hybrid PQC + QKD": ["Combines migration to PQC with experimental or high-assurance key delivery where links permit."]
  };
  const redFlags: string[] = [];

  if (input.trustModel === "software-only") {
    scores["PQC-only"] += 20;
    scores["QKD-only"] -= 30;
    scores["Hybrid PQC + QKD"] -= 10;
    redFlags.push("QKD requires specialized physical links and cannot be software-only.");
  }
  if (input.topology === "metro" && input.distanceKm <= 100) {
    scores["QKD-only"] += 15;
    scores["Hybrid PQC + QKD"] += 20;
    rationale["Hybrid PQC + QKD"].push("Metro distances are a plausible QKD exploration regime.");
  }
  if (input.topology === "long-haul" || input.distanceKm > 150) {
    scores["QKD-only"] -= 20;
    redFlags.push("Long-haul QKD generally requires trusted nodes, satellites, or repeaters that add assumptions.");
  }
  if (input.keyRateNeed === "high") {
    scores["QKD-only"] -= 15;
    scores["Hybrid PQC + QKD"] -= 5;
    redFlags.push("High application bandwidth should not assume one-time-pad scale QKD material.");
  }
  if (input.availabilityNeed === "mission-critical") {
    scores["PQC-only"] += 10;
    scores["Hybrid PQC + QKD"] += 5;
    scores["QKD-only"] -= 10;
    redFlags.push("Physical-layer availability and denial-of-service exposure need explicit operational planning.");
  }
  if (input.budgetMaturity === "mature") {
    scores["QKD-only"] += 10;
    scores["Hybrid PQC + QKD"] += 15;
  } else if (input.budgetMaturity === "early") {
    scores["PQC-only"] += 10;
    scores["QKD-only"] -= 10;
  }
  if (input.complianceDriver) {
    scores["PQC-only"] += 10;
    scores["Hybrid PQC + QKD"] += 10;
  }

  const scorecard = (Object.keys(scores) as Array<keyof typeof scores>)
    .map((architecture) => ({
      architecture,
      score: Math.max(0, Math.min(100, scores[architecture])),
      rationale: rationale[architecture]
    }))
    .sort((a, b) => b.score - a.score);

  return {
    scorecard,
    recommendation: scorecard[0].architecture,
    redFlags
  };
}
