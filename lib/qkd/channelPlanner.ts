import { dbToLinear, round } from "@/lib/math";
import { computeLinkBudget } from "@/lib/qkd/linkBudget";
import type { LinkBudgetInput, ModelWarning, SimulationResponse } from "@/lib/types";

export const CHANNEL_PLANNER_VERSION = "channel-planner.simplified.v1";

export type ChannelPlannerInput = {
  linkType: "fiber" | "free_space" | "satellite";
  lengthKm: number;
  fiberLossDbPerKm: number;
  connectorLossDb: number;
  spliceLossDb: number;
  componentLossDb: number;
  geometricLossDb: number;
  pointingLossDb: number;
  atmosphericLossDb: number;
  receiverOpticalLossDb: number;
  filterLossDb: number;
  averageSatelliteLossDb: number;
  dutyCycle: number;
  sourceRateHz: number;
  meanPhotonNumber: number;
  detectorEfficiency: number;
  darkCountProbability: number;
  backgroundCountProbability: number;
  misalignmentError: number;
};

export type ChannelPlannerResult = {
  totalLossDb: number;
  channelTransmittance: number;
  detectionProbability: number;
  availabilityFactor: number;
  linkNotes: string[];
  keyRateEstimateHz: number;
  qber: number;
};

export function planChannel(input: ChannelPlannerInput): SimulationResponse<ChannelPlannerInput, ChannelPlannerResult> {
  let totalLossDb = 0;
  const linkNotes: string[] = [];
  const availabilityFactor = input.linkType === "satellite" ? input.dutyCycle : 1;

  if (input.linkType === "fiber") {
    totalLossDb = input.fiberLossDbPerKm * input.lengthKm + input.connectorLossDb + input.spliceLossDb + input.componentLossDb;
    linkNotes.push("Fiber model uses linear attenuation plus connector, splice, and component losses.");
  } else if (input.linkType === "free_space") {
    totalLossDb = input.geometricLossDb + input.pointingLossDb + input.atmosphericLossDb + input.receiverOpticalLossDb + input.filterLossDb;
    linkNotes.push("Free-space model uses user-supplied geometric, pointing, atmospheric, receiver, and filter losses.");
  } else {
    totalLossDb = input.averageSatelliteLossDb + input.pointingLossDb + input.receiverOpticalLossDb + input.filterLossDb;
    linkNotes.push("Satellite-style model is a coarse pass-average loss with duty-cycle availability.");
  }

  const budgetInput: LinkBudgetInput = {
    protocol: "decoy_bb84",
    lengthKm: input.lengthKm,
    fiberLossDbPerKm: 0,
    connectorLossDb: totalLossDb,
    sourceRateHz: input.sourceRateHz * availabilityFactor,
    meanPhotonNumber: input.meanPhotonNumber,
    detectorEfficiency: input.detectorEfficiency,
    darkCountProbability: input.darkCountProbability,
    backgroundCountProbability: input.backgroundCountProbability,
    misalignmentError: input.misalignmentError,
    basisSiftingFactor: 0.5,
    senderZBasisProbability: 0.5,
    receiverZBasisProbability: 0.5,
    detectorDeadTimeNs: 0,
    afterpulseProbability: 0,
    reconciliationEfficiency: 1.16,
    blockSize: 1000000
  };
  const budget = computeLinkBudget(budgetInput);
  const warnings: ModelWarning[] = [...budget.warnings];
  if (input.linkType !== "fiber") {
    warnings.push({
      code: "coarse-channel",
      severity: "info",
      message: "This channel plan does not include diffraction, weather statistics, adaptive optics, or pass dynamics."
    });
  }

  return {
    input,
    result: {
      totalLossDb: round(totalLossDb, 4),
      channelTransmittance: dbToLinear(totalLossDb),
      detectionProbability: budget.result.clickProbability,
      availabilityFactor,
      linkNotes,
      keyRateEstimateHz: budget.result.secretKeyRateHz,
      qber: budget.result.qber
    },
    assumptions: [
      "Loss terms are added in dB and converted to a linear transmittance.",
      "The secure-key-rate estimate reuses the simplified QKD link-budget model.",
      "Weather, turbulence, fading, pointing dynamics, and finite-key security are outside the MVP model."
    ],
    warnings,
    version: CHANNEL_PLANNER_VERSION
  };
}
