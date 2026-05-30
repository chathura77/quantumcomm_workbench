import { clamp, dbToLinear, EPSILON, h2, round } from "@/lib/math";
import type { MdiQkdDistanceSweepPoint, MdiQkdInput, MdiQkdResult, ModelWarning, SimulationResponse } from "@/lib/types";

export const MDI_QKD_VERSION = "mdi-qkd.teaching.v1";

export const MDI_QKD_ASSUMPTIONS = [
  "This MDI-QKD slice is a teaching estimator for two-arm weak-coherent-state links into a middle Bell-state-measurement relay.",
  "The relay may be untrusted with respect to detector side channels, but the estimator still assumes Alice and Bob can authenticate the classical announcement channel.",
  "Two-photon interference, decoy-state optimization, finite-key security proofs, source leakage, and phase-reference calibration are compressed into scalar visibility, efficiency, and QBER proxies.",
  "Secret-key output is an asymptotic teaching lower-bound proxy. It is not a certified MDI-QKD implementation proof or deployment-grade performance guarantee."
];

function computeArmDetectionProbability(meanPhotonNumber: number, channelTransmittance: number, relayDetectorEfficiency: number) {
  return 1 - Math.exp(-meanPhotonNumber * channelTransmittance * relayDetectorEfficiency);
}

function buildDistanceValues(maxDistanceKm: number, steps: number) {
  if (steps <= 1) {
    return [0];
  }

  const step = maxDistanceKm / (steps - 1);
  return Array.from({ length: steps }, (_, index) => round(step * index, 6));
}

function estimateCore(input: MdiQkdInput): SimulationResponse<MdiQkdInput, Omit<MdiQkdResult, "distanceSweep">> {
  const aliceTotalLossDb = input.aliceLengthKm * input.fiberLossDbPerKm + input.aliceConnectorLossDb;
  const bobTotalLossDb = input.bobLengthKm * input.fiberLossDbPerKm + input.bobConnectorLossDb;
  const aliceChannelTransmittance = dbToLinear(aliceTotalLossDb);
  const bobChannelTransmittance = dbToLinear(bobTotalLossDb);
  const aliceRelayDetectionProbability = computeArmDetectionProbability(
    input.aliceMeanPhotonNumber,
    aliceChannelTransmittance,
    input.relayDetectorEfficiency
  );
  const bobRelayDetectionProbability = computeArmDetectionProbability(
    input.bobMeanPhotonNumber,
    bobChannelTransmittance,
    input.relayDetectorEfficiency
  );
  const symmetryRatio = Math.min(aliceChannelTransmittance, bobChannelTransmittance) / Math.max(aliceChannelTransmittance, bobChannelTransmittance, EPSILON);
  const interferencePenalty = clamp(input.interferenceVisibility * Math.sqrt(symmetryRatio), 0, 1);
  const jointSignalProbability = clamp(
    aliceRelayDetectionProbability *
      bobRelayDetectionProbability *
      input.bellStateMeasurementEfficiency *
      interferencePenalty,
    0,
    1
  );
  const relayNoiseProbability = clamp(2 * (input.relayDarkCountProbability + input.backgroundCountProbability), 0, 1);
  const coincidenceProbability = clamp(jointSignalProbability + relayNoiseProbability, 0, 1);
  const signalErrorProbability = clamp((1 - input.interferenceVisibility) / 2 + input.misalignmentError, 0, 0.5);
  const qber = coincidenceProbability <= EPSILON
    ? 0.5
    : clamp(
      (jointSignalProbability * signalErrorProbability + 0.5 * relayNoiseProbability) / coincidenceProbability,
      0,
      0.5
    );
  const relayAnnouncementRateHz = input.sourceRateHz * coincidenceProbability;
  const siftedRateHz = relayAnnouncementRateHz * input.basisSiftingFactor;
  const secretFraction = Math.max(0, 1 - input.reconciliationEfficiency * h2(qber) - h2(qber));
  const secretKeyRateHz = siftedRateHz * secretFraction;
  const announcedBellEvents = Math.max(0, Math.floor(input.blockSize * coincidenceProbability));
  const siftedBitsPerBlock = Math.max(0, Math.floor(announcedBellEvents * input.basisSiftingFactor));

  const warnings: ModelWarning[] = [];
  if (input.relayMode === "monitored") {
    warnings.push({
      code: "relay-monitoring",
      severity: "info",
      message: "This configuration assumes a monitored relay environment for diagnostics, but the key-rate logic still treats the Bell-state measurement device as a teaching proxy."
    });
  } else {
    warnings.push({
      code: "untrusted-relay",
      severity: "info",
      message: "The relay is treated as untrusted for detector security intuition, but announcement integrity and source-state characterization are still assumed."
    });
  }
  if (symmetryRatio < 0.7) {
    warnings.push({
      code: "arm-imbalance",
      severity: symmetryRatio < 0.4 ? "warning" : "info",
      message: "The two relay arms are imbalanced, so interference visibility and coincident Bell-state announcements are heavily penalized."
    });
  }
  if (input.interferenceVisibility < 0.9) {
    warnings.push({
      code: "low-visibility",
      severity: input.interferenceVisibility < 0.75 ? "warning" : "info",
      message: "Interference visibility is low for an MDI-QKD teaching setup, so the relay error proxy may dominate the asymptotic secret fraction."
    });
  }
  if (qber >= 0.11) {
    warnings.push({
      code: "high-qber",
      severity: qber >= 0.15 ? "critical" : "warning",
      message: "The MDI-QKD QBER proxy reaches a region where the asymptotic teaching key fraction is typically zero or marginal."
    });
  }
  if (secretKeyRateHz === 0) {
    warnings.push({
      code: "zero-rate",
      severity: "info",
      message: "Current relay efficiency, loss, and noise assumptions leave no asymptotic teaching key margin."
    });
  }

  return {
    input,
    result: {
      aliceTotalLossDb: round(aliceTotalLossDb, 6),
      bobTotalLossDb: round(bobTotalLossDb, 6),
      totalDistanceKm: round(input.aliceLengthKm + input.bobLengthKm, 6),
      aliceChannelTransmittance: round(aliceChannelTransmittance, 8),
      bobChannelTransmittance: round(bobChannelTransmittance, 8),
      aliceRelayDetectionProbability: round(aliceRelayDetectionProbability, 8),
      bobRelayDetectionProbability: round(bobRelayDetectionProbability, 8),
      symmetryRatio: round(symmetryRatio, 8),
      interferencePenalty: round(interferencePenalty, 8),
      jointSignalProbability: round(jointSignalProbability, 8),
      relayNoiseProbability: round(relayNoiseProbability, 8),
      coincidenceProbability: round(coincidenceProbability, 8),
      relayAnnouncementRateHz: round(relayAnnouncementRateHz, 6),
      siftedRateHz: round(siftedRateHz, 6),
      qber: round(qber, 8),
      secretFraction: round(secretFraction, 8),
      secretKeyRateHz: round(secretKeyRateHz, 6),
      announcedBellEvents,
      siftedBitsPerBlock
    },
    assumptions: [
      ...MDI_QKD_ASSUMPTIONS,
      "Each arm uses eta = 10^(-loss_dB / 10) with separate Alice and Bob loss budgets into the middle relay.",
      "Joint Bell-state announcements scale with both arm detection probabilities, a scalar Bell-state-measurement efficiency, and an interference penalty based on visibility and arm symmetry.",
      "Noise combines relay dark and background counts, then contributes a random-bit 50% error term in the coincidence proxy."
    ],
    warnings,
    version: MDI_QKD_VERSION
  };
}

function buildDistanceSweep(input: MdiQkdInput): MdiQkdDistanceSweepPoint[] {
  const currentTotalDistance = input.aliceLengthKm + input.bobLengthKm;
  const distanceShare = currentTotalDistance > 0
    ? input.aliceLengthKm / currentTotalDistance
    : 0.5;
  const maxDistanceKm = Math.max(20, currentTotalDistance * 1.6, currentTotalDistance + 40);

  return buildDistanceValues(maxDistanceKm, 15).map((totalDistanceKm) => {
    const response = estimateCore({
      ...input,
      aliceLengthKm: totalDistanceKm * distanceShare,
      bobLengthKm: totalDistanceKm * (1 - distanceShare)
    });

    return {
      totalDistanceKm,
      coincidenceProbability: response.result.coincidenceProbability,
      qber: response.result.qber,
      secretKeyRateHz: response.result.secretKeyRateHz,
      symmetryRatio: response.result.symmetryRatio
    };
  });
}

export function estimateMdiQkd(input: MdiQkdInput): SimulationResponse<MdiQkdInput, MdiQkdResult> {
  const response = estimateCore(input);

  return {
    ...response,
    result: {
      ...response.result,
      distanceSweep: buildDistanceSweep(input)
    }
  };
}
