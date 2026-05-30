import { clamp, EPSILON, h2, round } from "@/lib/math";
import { computeLinkBudget } from "@/lib/qkd/linkBudget";
import type {
  FiniteKeyBb84Input,
  FiniteKeyBb84Result,
  FiniteKeySensitivitySweep,
  FiniteKeyUncertaintyBandPoint,
  ModelWarning,
  SimulationResponse
} from "@/lib/types";

export const FINITE_KEY_BB84_VERSION = "finite-key-bb84.teaching.v1";

export const FINITE_KEY_BB84_ASSUMPTIONS = [
  "This teaching model reuses the simplified BB84 link-budget proxy, then adds finite-size penalties through Hoeffding-style concentration terms.",
  "Block size is treated as the emitted pulse batch for one finite-key round, and the reported key-rate proxy normalizes the final key fraction back onto the configured source rate.",
  "Security epsilons are explicit bookkeeping knobs, not a substitute for a composable proof tied to a calibrated implementation.",
  "Detector dead time, afterpulsing, and basis bias now enter through the shared link-budget teaching kernel, but they remain coarse proxies rather than calibrated hardware submodels.",
  "Decoy-state mode reuses the shared single-photon lower-bound teaching proxy, but rigorous decoy-state estimation, intensity optimization, and composable implementation proofs remain out of scope in this slice.",
  "Sensitivity sweeps and uncertainty bands are teaching aids based on the same simplified kernel; they are not confidence intervals for deployed hardware."
];

function finiteSizePenalty(sampleSize: number, epsilon: number) {
  if (sampleSize <= 0) {
    return 0.5;
  }

  return Math.sqrt(Math.log(2 / Math.max(epsilon, EPSILON)) / (2 * sampleSize));
}

function calculatePrivacyAmplificationBits(keyGenerationBits: number, qberBound: number) {
  return Math.ceil(keyGenerationBits * h2(qberBound));
}

function buildSweepValues(min: number, max: number, steps: number) {
  if (steps <= 1 || max <= min) {
    return [round(min, 6)];
  }

  const step = (max - min) / (steps - 1);
  return Array.from({ length: steps }, (_, index) => round(min + step * index, 6));
}

function buildBlockSizeValues(blockSize: number, steps: number) {
  const minimum = Math.max(10_000, Math.floor(blockSize / 20));
  const maximum = Math.max(minimum + 1, Math.floor(blockSize * 2));
  if (steps <= 1 || maximum <= minimum) {
    return [minimum];
  }

  return Array.from({ length: steps }, (_, index) => {
    const t = index / (steps - 1);
    const value = Math.exp(Math.log(minimum) + (Math.log(maximum) - Math.log(minimum)) * t);
    return Math.max(1, Math.floor(value));
  });
}

function estimateFiniteKeyBb84Core(input: FiniteKeyBb84Input): SimulationResponse<FiniteKeyBb84Input, Omit<FiniteKeyBb84Result, "sensitivitySweeps" | "distanceUncertaintyBand">> {
  const link = computeLinkBudget(input);
  const emittedSignals = Math.max(1, Math.floor(input.blockSize));
  const rawDetections = Math.max(0, Math.floor(emittedSignals * link.result.clickProbability));
  const siftedBits = Math.max(0, Math.floor(rawDetections * link.result.effectiveSiftingFactor));
  const parameterEstimationBits = Math.min(siftedBits, Math.max(1, Math.ceil(siftedBits * input.sampleFraction)));
  const keyGenerationBits = Math.max(0, siftedBits - parameterEstimationBits);
  const pePenalty = finiteSizePenalty(parameterEstimationBits, input.epsilonParameterEstimation);
  const secrecyPenalty = finiteSizePenalty(Math.max(keyGenerationBits, 1), input.epsilonSecrecy);
  const statisticalPenalty = pePenalty + secrecyPenalty;
  const observedQber = link.result.qber;
  const qberUpperBound = clamp(observedQber + statisticalPenalty, 0, 0.5);
  const reconciliationLeakageBits = Math.ceil(input.reconciliationEfficiency * keyGenerationBits * h2(observedQber));
  const privacyAmplificationBits = calculatePrivacyAmplificationBits(keyGenerationBits, qberUpperBound);
  const correctnessPenaltyBits = Math.max(0, Math.ceil(Math.log2(2 / Math.max(input.epsilonCorrectness, EPSILON))));
  const secrecyPenaltyBits = Math.max(0, Math.ceil(2 * Math.log2(1 / Math.max(input.epsilonSecrecy, EPSILON))));
  const finalKeyBits = Math.max(
    0,
    keyGenerationBits -
      reconciliationLeakageBits -
      privacyAmplificationBits -
      correctnessPenaltyBits -
      secrecyPenaltyBits
  );
  const warnings: ModelWarning[] = [...link.warnings];

  if (parameterEstimationBits < 10_000) {
    warnings.push({
      code: "small-pe-sample",
      severity: "warning",
      message: "The parameter-estimation sample is small, so the finite-key teaching bound is dominated by statistical slack."
    });
  }
  if (qberUpperBound >= 0.11) {
    warnings.push({
      code: "finite-key-qber-threshold",
      severity: qberUpperBound >= 0.15 ? "critical" : "warning",
      message: "The finite-key upper-bound QBER reaches or exceeds common BB84 teaching thresholds; treat any remaining key as non-certified."
    });
  }
  if (finalKeyBits === 0) {
    warnings.push({
      code: "finite-key-zero",
      severity: "info",
      message: "Finite-key penalties and leakage consume the entire block for these assumptions."
    });
  }
  warnings.push({
    code: "teaching-model",
    severity: "info",
    message: "This output is a non-certified teaching lower bound and should not be treated as an operational security guarantee."
  });
  if (input.detectorDeadTimeNs > 0 || input.afterpulseProbability > 0 || input.senderZBasisProbability !== 0.5 || input.receiverZBasisProbability !== 0.5) {
    warnings.push({
      code: "hardware-proxy",
      severity: "info",
      message: "Dead time, afterpulsing, and basis bias are modeled with coarse teaching proxies; use them for sensitivity studies, not certification claims."
    });
  }
  if (link.result.decoyLowerBound) {
    warnings.push({
      code: "decoy-lower-bound",
      severity: "info",
      message: "The decoy-state view reuses the shared single-photon lower-bound teaching proxy before finite-key penalties are applied."
    });
  }

  return {
    input,
    result: {
      emittedSignals,
      rawDetections,
      siftedBits,
      parameterEstimationBits,
      keyGenerationBits,
      basisAgreementProbability: link.result.basisAgreementProbability,
      effectiveSiftingFactor: link.result.effectiveSiftingFactor,
      observedQber: round(observedQber, 8),
      afterpulseNoiseProbability: round(link.result.afterpulseNoiseProbability, 8),
      deadTimeAvailabilityFactor: round(link.result.deadTimeAvailabilityFactor, 8),
      parameterEstimationPenalty: round(pePenalty, 8),
      secrecyQberPenalty: round(secrecyPenalty, 8),
      qberUpperBound: round(qberUpperBound, 8),
      statisticalPenalty: round(statisticalPenalty, 8),
      reconciliationLeakageBits,
      privacyAmplificationBits,
      correctnessPenaltyBits,
      secrecyPenaltyBits,
      finalKeyBits,
      secretFractionPerPulse: emittedSignals > 0 ? finalKeyBits / emittedSignals : 0,
      secretKeyRateHz: input.sourceRateHz * (emittedSignals > 0 ? finalKeyBits / emittedSignals : 0),
      decoyLowerBound: link.result.decoyLowerBound
    },
    assumptions: [
      ...FINITE_KEY_BB84_ASSUMPTIONS,
      ...link.assumptions
    ],
    warnings,
    version: FINITE_KEY_BB84_VERSION
  };
}

function buildSensitivitySweeps(input: FiniteKeyBb84Input): FiniteKeySensitivitySweep[] {
  const sweepCount = 15;
  const distanceMax = Math.max(20, input.lengthKm * 1.6, input.lengthKm + 40);
  const addedLossMax = Math.max(2, input.connectorLossDb + 12);
  const qberMisalignmentMax = Math.max(0.03, Math.min(0.18, input.misalignmentError * 2 + 0.05));
  const detectorEfficiencyMax = Math.min(0.95, Math.max(0.05, input.detectorEfficiency * 1.75));

  const distanceSweep: FiniteKeySensitivitySweep = {
    axis: "distanceKm",
    label: "Distance sensitivity",
    unit: "km",
    points: buildSweepValues(0, distanceMax, sweepCount).map((lengthKm) => {
      const response = estimateFiniteKeyBb84Core({ ...input, lengthKm });
      return {
        value: lengthKm,
        observedQber: response.result.observedQber,
        qberUpperBound: response.result.qberUpperBound,
        finalKeyBits: response.result.finalKeyBits,
        secretKeyRateHz: response.result.secretKeyRateHz
      };
    })
  };

  const lossSweep: FiniteKeySensitivitySweep = {
    axis: "addedLossDb",
    label: "Added loss sensitivity",
    unit: "dB",
    points: buildSweepValues(0, addedLossMax, sweepCount).map((addedLossDb) => {
      const response = estimateFiniteKeyBb84Core({ ...input, connectorLossDb: input.connectorLossDb + addedLossDb });
      return {
        value: addedLossDb,
        observedQber: response.result.observedQber,
        qberUpperBound: response.result.qberUpperBound,
        finalKeyBits: response.result.finalKeyBits,
        secretKeyRateHz: response.result.secretKeyRateHz
      };
    })
  };

  const qberSweep: FiniteKeySensitivitySweep = {
    axis: "observedQber",
    label: "Observed QBER sensitivity",
    unit: "%",
    points: buildSweepValues(0, qberMisalignmentMax, sweepCount)
      .map((misalignmentError) => estimateFiniteKeyBb84Core({ ...input, misalignmentError }))
      .map((response) => ({
        value: round(response.result.observedQber * 100, 6),
        observedQber: response.result.observedQber,
        qberUpperBound: response.result.qberUpperBound,
        finalKeyBits: response.result.finalKeyBits,
        secretKeyRateHz: response.result.secretKeyRateHz
      }))
  };

  const efficiencySweep: FiniteKeySensitivitySweep = {
    axis: "detectorEfficiency",
    label: "Detector-efficiency sensitivity",
    unit: "",
    points: buildSweepValues(0.05, detectorEfficiencyMax, sweepCount).map((detectorEfficiency) => {
      const response = estimateFiniteKeyBb84Core({ ...input, detectorEfficiency });
      return {
        value: detectorEfficiency,
        observedQber: response.result.observedQber,
        qberUpperBound: response.result.qberUpperBound,
        finalKeyBits: response.result.finalKeyBits,
        secretKeyRateHz: response.result.secretKeyRateHz
      };
    })
  };

  const blockSizeSweep: FiniteKeySensitivitySweep = {
    axis: "blockSize",
    label: "Block-size sensitivity",
    unit: "signals",
    points: buildBlockSizeValues(input.blockSize, 11).map((blockSize) => {
      const response = estimateFiniteKeyBb84Core({ ...input, blockSize });
      return {
        value: blockSize,
        observedQber: response.result.observedQber,
        qberUpperBound: response.result.qberUpperBound,
        finalKeyBits: response.result.finalKeyBits,
        secretKeyRateHz: response.result.secretKeyRateHz
      };
    })
  };

  return [distanceSweep, lossSweep, qberSweep, efficiencySweep, blockSizeSweep];
}

function buildDistanceUncertaintyBand(input: FiniteKeyBb84Input): FiniteKeyUncertaintyBandPoint[] {
  const distanceMax = Math.max(20, input.lengthKm * 1.6, input.lengthKm + 40);

  return buildSweepValues(0, distanceMax, 15).map((lengthKm) => {
    const response = estimateFiniteKeyBb84Core({ ...input, lengthKm });
    const privacyWithObserved = calculatePrivacyAmplificationBits(response.result.keyGenerationBits, response.result.observedQber);
    const privacyWithPeOnly = calculatePrivacyAmplificationBits(
      response.result.keyGenerationBits,
      clamp(response.result.observedQber + response.result.parameterEstimationPenalty, 0, 0.5)
    );
    const optimisticFinalKeyBits = Math.max(
      0,
      response.result.keyGenerationBits -
        response.result.reconciliationLeakageBits -
        privacyWithObserved -
        response.result.correctnessPenaltyBits -
        response.result.secrecyPenaltyBits
    );
    const baselineFinalKeyBits = Math.max(
      0,
      response.result.keyGenerationBits -
        response.result.reconciliationLeakageBits -
        privacyWithPeOnly -
        response.result.correctnessPenaltyBits -
        response.result.secrecyPenaltyBits
    );
    const conservativeFinalKeyBits = response.result.finalKeyBits;
    const denominator = Math.max(1, response.result.emittedSignals);

    return {
      distanceKm: lengthKm,
      optimisticFinalKeyBits,
      baselineFinalKeyBits,
      conservativeFinalKeyBits,
      optimisticKeyRateHz: input.sourceRateHz * (optimisticFinalKeyBits / denominator),
      baselineKeyRateHz: input.sourceRateHz * (baselineFinalKeyBits / denominator),
      conservativeKeyRateHz: input.sourceRateHz * (conservativeFinalKeyBits / denominator)
    };
  });
}

export function estimateFiniteKeyBb84(input: FiniteKeyBb84Input): SimulationResponse<FiniteKeyBb84Input, FiniteKeyBb84Result> {
  const response = estimateFiniteKeyBb84Core(input);

  return {
    ...response,
    result: {
      ...response.result,
      sensitivitySweeps: buildSensitivitySweeps(input),
      distanceUncertaintyBand: buildDistanceUncertaintyBand(input)
    }
  };
}
