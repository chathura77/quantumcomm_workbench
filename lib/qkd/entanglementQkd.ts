import { clamp, dbToLinear, EPSILON, h2, round } from "@/lib/math";
import type {
  EntanglementQkdDistanceSweepPoint,
  EntanglementQkdInput,
  EntanglementQkdResult,
  ModelWarning,
  SimulationResponse
} from "@/lib/types";

export const ENTANGLEMENT_QKD_VERSION = "entanglement-qkd.teaching.v1";

export const ENTANGLEMENT_QKD_ASSUMPTIONS = [
  "This estimator models entanglement-based BBM92 and E91 links as source-in-the-middle teaching proxies rather than prepare-and-measure BB84 variants.",
  "Coincidences are estimated from pair-emission probability, two independent lossy arms, scalar detector efficiencies, and accidental-noise terms.",
  "E91 Bell monitoring is represented by a CHSH-style visibility proxy and a configurable Bell-test sample fraction, not by a loophole-free or device-independent security proof.",
  "Secret-key output is an asymptotic teaching proxy with explicit caution about source quality, timing, and detector assumptions. It is not a certified deployment-grade key-rate guarantee."
];

function buildDistanceValues(maxDistanceKm: number, steps: number) {
  if (steps <= 1) {
    return [0];
  }

  const step = maxDistanceKm / (steps - 1);
  return Array.from({ length: steps }, (_, index) => round(step * index, 6));
}

function estimateCore(input: EntanglementQkdInput): SimulationResponse<EntanglementQkdInput, Omit<EntanglementQkdResult, "distanceSweep">> {
  const aliceTotalLossDb = input.aliceLengthKm * input.fiberLossDbPerKm + input.aliceInsertionLossDb;
  const bobTotalLossDb = input.bobLengthKm * input.fiberLossDbPerKm + input.bobInsertionLossDb;
  const aliceArmTransmittance = dbToLinear(aliceTotalLossDb) * input.detectorEfficiencyAlice;
  const bobArmTransmittance = dbToLinear(bobTotalLossDb) * input.detectorEfficiencyBob;
  const pairCollectionProbability = clamp(
    input.pairEmissionProbability * aliceArmTransmittance * bobArmTransmittance,
    0,
    1
  );
  const armNoiseAlice = clamp(input.darkCountProbabilityAlice + input.backgroundCountProbabilityAlice, 0, 1);
  const armNoiseBob = clamp(input.darkCountProbabilityBob + input.backgroundCountProbabilityBob, 0, 1);
  const coincidenceWindowFactor = clamp(input.coincidenceWindowNs * input.pairGenerationRateHz * 1e-9, 0, 1);
  const accidentalCoincidenceProbability = clamp(
    coincidenceWindowFactor * (
      pairCollectionProbability * (armNoiseAlice + armNoiseBob) +
      armNoiseAlice * armNoiseBob
    ),
    0,
    1
  );
  const coincidenceProbability = clamp(pairCollectionProbability + accidentalCoincidenceProbability, 0, 1);
  const effectiveVisibility = clamp(
    input.sourceVisibility * Math.max(0, 2 * input.sourceBellStateFidelity - 1),
    0,
    1
  );
  const signalErrorProbability = clamp((1 - effectiveVisibility) / 2 + input.misalignmentError, 0, 0.5);
  const qber = coincidenceProbability <= EPSILON
    ? 0.5
    : clamp(
      (pairCollectionProbability * signalErrorProbability + 0.5 * accidentalCoincidenceProbability) / coincidenceProbability,
      0,
      0.5
    );
  const chshPenalty = clamp(1 - 2 * qber, 0, 1);
  const chshScore = clamp(2 * Math.SQRT2 * effectiveVisibility * chshPenalty, 0, 2 * Math.SQRT2);
  const bellViolationMargin = Math.max(0, chshScore - 2);
  const rawCoincidenceRateHz = input.pairGenerationRateHz * coincidenceProbability;
  const siftedRateHz = rawCoincidenceRateHz * input.basisSiftingFactor;
  const keyGenerationFraction = input.protocol === "e91"
    ? Math.max(0.25, 1 - input.bellTestFraction)
    : Math.max(0.5, 1 - input.bellTestFraction * 0.5);
  const usableRateHz = siftedRateHz * keyGenerationFraction;
  const secretFraction = Math.max(0, 1 - input.reconciliationEfficiency * h2(qber) - h2(qber));
  const secretKeyRateHz = usableRateHz * secretFraction;
  const estimatedPairsPerBlock = Math.max(0, Math.floor(input.blockSize * coincidenceProbability));
  const keyGenerationPairsPerBlock = Math.max(0, Math.floor(estimatedPairsPerBlock * keyGenerationFraction));

  const warnings: ModelWarning[] = [
    {
      code: input.protocol === "e91" ? "bell-proxy" : "entanglement-source",
      severity: "info",
      message: input.protocol === "e91"
        ? "The E91 Bell-monitoring output is a CHSH-style teaching proxy that does not close detection, locality, or memory loopholes."
        : "The BBM92 result is entanglement-source-based and intentionally separated from prepare-and-measure BB84 assumptions."
    }
  ];

  if (effectiveVisibility < 0.9) {
    warnings.push({
      code: "low-visibility",
      severity: effectiveVisibility < 0.75 ? "warning" : "info",
      message: "Source visibility and Bell-state fidelity reduce entanglement correlations, increasing the coincidence-error proxy."
    });
  }

  if (input.protocol === "e91" && chshScore <= 2) {
    warnings.push({
      code: "no-bell-violation",
      severity: "warning",
      message: "The CHSH-style score falls at or below the classical threshold, so the E91 monitoring intuition no longer shows a Bell-violation margin."
    });
  }

  if (qber >= 0.11) {
    warnings.push({
      code: "high-qber",
      severity: qber >= 0.15 ? "critical" : "warning",
      message: "The entanglement-based QBER proxy is high enough that the asymptotic teaching key fraction is zero or marginal."
    });
  }

  if (secretKeyRateHz === 0) {
    warnings.push({
      code: "zero-rate",
      severity: "info",
      message: "Current pair brightness, loss, and coincidence-noise assumptions leave no asymptotic teaching key margin."
    });
  }

  return {
    input,
    result: {
      aliceTotalLossDb: round(aliceTotalLossDb, 6),
      bobTotalLossDb: round(bobTotalLossDb, 6),
      totalDistanceKm: round(input.aliceLengthKm + input.bobLengthKm, 6),
      aliceArmTransmittance: round(aliceArmTransmittance, 8),
      bobArmTransmittance: round(bobArmTransmittance, 8),
      pairCollectionProbability: round(pairCollectionProbability, 10),
      accidentalCoincidenceProbability: round(accidentalCoincidenceProbability, 10),
      coincidenceProbability: round(coincidenceProbability, 10),
      effectiveVisibility: round(effectiveVisibility, 8),
      qber: round(qber, 8),
      chshScore: round(chshScore, 8),
      bellViolationMargin: round(bellViolationMargin, 8),
      rawCoincidenceRateHz: round(rawCoincidenceRateHz, 6),
      siftedRateHz: round(siftedRateHz, 6),
      keyGenerationFraction: round(keyGenerationFraction, 8),
      estimatedPairsPerBlock,
      keyGenerationPairsPerBlock,
      secretFraction: round(secretFraction, 8),
      secretKeyRateHz: round(secretKeyRateHz, 6)
    },
    assumptions: [
      ...ENTANGLEMENT_QKD_ASSUMPTIONS,
      "Each arm uses eta = eta_det 10^(-loss_dB / 10), so the emitted entangled pair must survive both lossy detection paths.",
      "Accidental coincidences are scaled by a coincidence-window factor and arm noise probabilities, then contribute a random-bit 50% error term.",
      "BBM92 and E91 share the same entanglement-source coincidence model here, while E91 additionally reserves Bell-test samples before key-generation accounting."
    ],
    warnings,
    version: ENTANGLEMENT_QKD_VERSION
  };
}

function buildDistanceSweep(input: EntanglementQkdInput): EntanglementQkdDistanceSweepPoint[] {
  const currentTotalDistance = input.aliceLengthKm + input.bobLengthKm;
  const distanceShare = currentTotalDistance > 0 ? input.aliceLengthKm / currentTotalDistance : 0.5;
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
      chshScore: response.result.chshScore,
      secretKeyRateHz: response.result.secretKeyRateHz
    };
  });
}

export function estimateEntanglementQkd(input: EntanglementQkdInput): SimulationResponse<EntanglementQkdInput, EntanglementQkdResult> {
  const response = estimateCore(input);

  return {
    ...response,
    result: {
      ...response.result,
      distanceSweep: buildDistanceSweep(input)
    }
  };
}
