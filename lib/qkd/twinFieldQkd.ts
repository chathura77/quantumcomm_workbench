import { clamp, dbToLinear, EPSILON, h2, round } from "@/lib/math";
import type {
  ModelWarning,
  SimulationResponse,
  TwinFieldQkdDistanceSweepPoint,
  TwinFieldQkdInput,
  TwinFieldQkdResult
} from "@/lib/types";

export const TWIN_FIELD_QKD_VERSION = "twin-field-qkd.teaching.v1";

export const TWIN_FIELD_QKD_ASSUMPTIONS = [
  "This twin-field QKD slice is a teaching estimator for weak coherent states interfering at a middle station with scalar phase-stability controls.",
  "Decoy-state optimization, phase-reference leakage analysis, finite-key proofs, and detector calibration are compressed into visibility, phase-tracking, and post-selection proxies.",
  "The middle station may be treated as untrusted for measurement intuition, but authenticated classical coordination and characterized transmitters are still assumed.",
  "Reported secret-key output is a non-certified teaching proxy for intuition about phase-sensitive long-distance scaling. It is not a deployment-grade TF-QKD proof."
];

function computeArrivalProbability(meanPhotonNumber: number, channelTransmittance: number, detectorEfficiency: number) {
  return 1 - Math.exp(-meanPhotonNumber * channelTransmittance * detectorEfficiency);
}

function buildDistanceValues(maxDistanceKm: number, steps: number) {
  if (steps <= 1) {
    return [0];
  }

  const step = maxDistanceKm / (steps - 1);
  return Array.from({ length: steps }, (_, index) => round(step * index, 6));
}

function estimateCore(input: TwinFieldQkdInput): SimulationResponse<TwinFieldQkdInput, Omit<TwinFieldQkdResult, "distanceSweep">> {
  const aliceTotalLossDb = input.aliceLengthKm * input.fiberLossDbPerKm + input.aliceConnectorLossDb;
  const bobTotalLossDb = input.bobLengthKm * input.fiberLossDbPerKm + input.bobConnectorLossDb;
  const aliceChannelTransmittance = dbToLinear(aliceTotalLossDb);
  const bobChannelTransmittance = dbToLinear(bobTotalLossDb);
  const aliceArrivalProbability = computeArrivalProbability(
    input.aliceMeanPhotonNumber,
    aliceChannelTransmittance,
    input.middleStationDetectorEfficiency
  );
  const bobArrivalProbability = computeArrivalProbability(
    input.bobMeanPhotonNumber,
    bobChannelTransmittance,
    input.middleStationDetectorEfficiency
  );
  const symmetryRatio = Math.min(aliceChannelTransmittance, bobChannelTransmittance) / Math.max(aliceChannelTransmittance, bobChannelTransmittance, EPSILON);
  const phaseStabilityFactor = clamp(
    input.phaseTrackingEfficiency * Math.exp(-(input.phaseErrorSigmaRad * input.phaseErrorSigmaRad) / 2),
    0,
    1
  );
  const interferencePenalty = clamp(
    input.interferenceVisibility * phaseStabilityFactor * Math.sqrt(symmetryRatio),
    0,
    1
  );
  const singlePhotonWeight = clamp(
    Math.exp(-(input.aliceMeanPhotonNumber + input.bobMeanPhotonNumber)) *
      (input.aliceMeanPhotonNumber + input.bobMeanPhotonNumber),
    0,
    1
  );
  const middleStationSignalProbability = clamp(
    0.5 *
      (aliceArrivalProbability + bobArrivalProbability) *
      singlePhotonWeight *
      interferencePenalty *
      input.phasePostSelectionFraction,
    0,
    1
  );
  const middleStationNoiseProbability = clamp(2 * (input.darkCountProbability + input.backgroundCountProbability), 0, 1);
  const clickProbability = clamp(middleStationSignalProbability + middleStationNoiseProbability, 0, 1);
  const signalErrorProbability = clamp((1 - interferencePenalty) / 2, 0, 0.5);
  const qber = clickProbability <= EPSILON
    ? 0.5
    : clamp(
      (middleStationSignalProbability * signalErrorProbability + 0.5 * middleStationNoiseProbability) / clickProbability,
      0,
      0.5
    );
  const middleStationClickRateHz = input.sourceRateHz * clickProbability;
  const siftedRateHz = middleStationClickRateHz * input.basisSiftingFactor;
  const secretFraction = Math.max(0, 1 - input.reconciliationEfficiency * h2(qber) - 0.5 * h2(qber));
  const secretKeyRateHz = siftedRateHz * secretFraction;
  const acceptedWindowsPerBlock = Math.max(0, Math.floor(input.blockSize * input.phasePostSelectionFraction));
  const siftedBitsPerBlock = Math.max(0, Math.floor(acceptedWindowsPerBlock * clickProbability * input.basisSiftingFactor));

  const warnings: ModelWarning[] = [];
  if (input.stationMode === "monitored") {
    warnings.push({
      code: "station-monitoring",
      severity: "info",
      message: "This configuration assumes extra diagnostics at the middle station, but the estimator still treats the interference node as a teaching proxy rather than a calibrated implementation."
    });
  } else {
    warnings.push({
      code: "untrusted-station",
      severity: "info",
      message: "The middle station is treated as untrusted for measurement intuition, but authenticated announcements and characterized source states are still assumed."
    });
  }
  if (symmetryRatio < 0.7) {
    warnings.push({
      code: "arm-imbalance",
      severity: symmetryRatio < 0.4 ? "warning" : "info",
      message: "The two twin-field arms are imbalanced, so the simplified interference term is heavily penalized."
    });
  }
  if (phaseStabilityFactor < 0.85) {
    warnings.push({
      code: "phase-instability",
      severity: phaseStabilityFactor < 0.6 ? "warning" : "info",
      message: "Phase tracking is weak for a twin-field lesson, so the middle-station interference advantage is strongly suppressed."
    });
  }
  if (input.phasePostSelectionFraction < 0.5) {
    warnings.push({
      code: "low-post-selection",
      severity: "info",
      message: "Only a small fraction of phase windows survive post-selection, which limits the teaching rate advantage despite any distance-scaling intuition."
    });
  }
  if (qber >= 0.11) {
    warnings.push({
      code: "high-qber",
      severity: qber >= 0.15 ? "critical" : "warning",
      message: "The TF-QKD QBER proxy reaches a region where the teaching secret fraction is typically zero or marginal."
    });
  }
  if (secretKeyRateHz === 0) {
    warnings.push({
      code: "zero-rate",
      severity: "info",
      message: "Current loss, phase stability, and noise assumptions leave no TF-QKD teaching key margin."
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
      symmetryRatio: round(symmetryRatio, 8),
      aliceArrivalProbability: round(aliceArrivalProbability, 8),
      bobArrivalProbability: round(bobArrivalProbability, 8),
      phaseStabilityFactor: round(phaseStabilityFactor, 8),
      interferencePenalty: round(interferencePenalty, 8),
      singlePhotonWeight: round(singlePhotonWeight, 8),
      middleStationSignalProbability: round(middleStationSignalProbability, 8),
      middleStationNoiseProbability: round(middleStationNoiseProbability, 8),
      clickProbability: round(clickProbability, 8),
      qber: round(qber, 8),
      middleStationClickRateHz: round(middleStationClickRateHz, 6),
      siftedRateHz: round(siftedRateHz, 6),
      secretFraction: round(secretFraction, 8),
      secretKeyRateHz: round(secretKeyRateHz, 6),
      acceptedWindowsPerBlock,
      siftedBitsPerBlock
    },
    assumptions: [
      ...TWIN_FIELD_QKD_ASSUMPTIONS,
      "Each arm uses eta = 10^(-loss_dB / 10) with separate Alice and Bob loss budgets into the middle station.",
      "Phase stability is compressed into eta_phase = eta_track exp(-sigma_phi^2 / 2), where sigma_phi is an RMS phase-error proxy in radians.",
      "The middle-station signal term scales with a single-photon weight proxy, average arm arrival probability, interference visibility, symmetry, and accepted phase-post-selection windows."
    ],
    warnings,
    version: TWIN_FIELD_QKD_VERSION
  };
}

function buildDistanceSweep(input: TwinFieldQkdInput): TwinFieldQkdDistanceSweepPoint[] {
  const currentTotalDistance = input.aliceLengthKm + input.bobLengthKm;
  const distanceShare = currentTotalDistance > 0
    ? input.aliceLengthKm / currentTotalDistance
    : 0.5;
  const maxDistanceKm = Math.max(40, currentTotalDistance * 1.5, currentTotalDistance + 80);

  return buildDistanceValues(maxDistanceKm, 15).map((totalDistanceKm) => {
    const response = estimateCore({
      ...input,
      aliceLengthKm: totalDistanceKm * distanceShare,
      bobLengthKm: totalDistanceKm * (1 - distanceShare)
    });

    return {
      totalDistanceKm,
      qber: response.result.qber,
      secretKeyRateHz: response.result.secretKeyRateHz,
      phaseStabilityFactor: response.result.phaseStabilityFactor,
      interferencePenalty: response.result.interferencePenalty
    };
  });
}

export function estimateTwinFieldQkd(input: TwinFieldQkdInput): SimulationResponse<TwinFieldQkdInput, TwinFieldQkdResult> {
  const response = estimateCore(input);

  return {
    ...response,
    result: {
      ...response.result,
      distanceSweep: buildDistanceSweep(input)
    }
  };
}
