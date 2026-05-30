import { dbToLinear, round } from "@/lib/math";
import type { ModelWarning, SimulationResponse } from "@/lib/types";

export const REPEATER_VERSION = "repeater-chain.simplified.v1";

export type RepeaterOptimizeInput = {
  totalDistanceKm: number;
  attenuationDbPerKm: number;
  memoryLifetimeMs: number;
  attemptRateHz: number;
  targetFidelity: number;
  maxRepeaters: number;
};

export type RepeaterCandidate = {
  repeaters: number;
  segments: number;
  segmentLengthKm: number;
  segmentLossDb: number;
  linkSuccessProbability: number;
  chainSuccessProbability: number;
  fidelityProxy: number;
  rateProxyHz: number;
  score: number;
  meetsTargetFidelity: boolean;
};

export function optimizeRepeaterChain(input: RepeaterOptimizeInput): SimulationResponse<RepeaterOptimizeInput, { candidates: RepeaterCandidate[]; bestCandidate: RepeaterCandidate; warnings: ModelWarning[] }> {
  const detectorEfficiencyProxy = 0.8;
  const swapSuccessProbability = 0.5;
  const initialLinkFidelity = 0.98;
  const swapFidelityPenalty = 0.98;
  const candidates: RepeaterCandidate[] = [];

  for (let repeaters = 0; repeaters <= input.maxRepeaters; repeaters += 1) {
    const segments = repeaters + 1;
    const segmentLengthKm = input.totalDistanceKm / segments;
    const segmentLossDb = input.attenuationDbPerKm * segmentLengthKm;
    const linkSuccessProbability = dbToLinear(segmentLossDb) * detectorEfficiencyProxy;
    const chainSuccessProbability = linkSuccessProbability ** segments * swapSuccessProbability ** repeaters;
    const rateProxyHz = input.attemptRateHz * chainSuccessProbability;
    const fidelityProxy = initialLinkFidelity ** segments * swapFidelityPenalty ** repeaters;
    const meetsTargetFidelity = fidelityProxy >= input.targetFidelity;
    candidates.push({
      repeaters,
      segments,
      segmentLengthKm: round(segmentLengthKm, 4),
      segmentLossDb: round(segmentLossDb, 4),
      linkSuccessProbability,
      chainSuccessProbability,
      fidelityProxy,
      rateProxyHz,
      score: Math.log(rateProxyHz + 1e-12) + 4 * fidelityProxy,
      meetsTargetFidelity
    });
  }

  const viable = candidates.filter((candidate) => candidate.meetsTargetFidelity);
  const bestCandidate = [...(viable.length > 0 ? viable : candidates)].sort((a, b) => b.score - a.score)[0];
  const warnings: ModelWarning[] = [];
  if (viable.length === 0) {
    warnings.push({
      code: "target-fidelity-unmet",
      severity: "warning",
      message: "No candidate meets the requested target fidelity; the selected candidate has the best balanced proxy score."
    });
  }
  if (input.memoryLifetimeMs < (input.totalDistanceKm / 200) * 2) {
    warnings.push({
      code: "memory-lifetime",
      severity: "info",
      message: "Memory lifetime may be short relative to round-trip classical signaling time."
    });
  }

  return {
    input,
    result: { candidates, bestCandidate, warnings },
    assumptions: [
      "Each repeater creates equal-length segments.",
      "Detector efficiency, swap success, and swap fidelity penalties are fixed MVP constants.",
      "The optimizer ranks transparent proxies rather than a hardware-calibrated repeater architecture."
    ],
    warnings,
    version: REPEATER_VERSION
  };
}
