import { clamp, dbToLinear, EPSILON, h2, round } from "@/lib/math";
import type { LinkBudgetInput, LinkBudgetResult, ModelWarning, SimulationResponse } from "@/lib/types";

export const LINK_BUDGET_VERSION = "qkd-link-budget.simplified.v1";

export const LINK_BUDGET_ASSUMPTIONS = [
  "Asymptotic prepare-and-measure approximation with independent dark/background counts.",
  "Detector dead time uses a non-paralyzable availability proxy, afterpulsing is modeled as a click-correlated noise term, and basis bias rescales the effective sifted fraction relative to the unbiased BB84 baseline.",
  "Finite-key proof terms, rigorous decoy optimization, timing jitter, and side channels are still outside this teaching slice.",
  "Secret fraction uses max(0, 1 - f_ec h2(Q) - h2(Q)); decoy-state mode replaces that asymptotic fraction with a single-photon lower-bound teaching proxy."
];

export function computeLinkBudget(input: LinkBudgetInput): SimulationResponse<LinkBudgetInput, LinkBudgetResult> {
  const totalLossDb = input.fiberLossDbPerKm * input.lengthKm + input.connectorLossDb;
  const channelTransmittance = dbToLinear(totalLossDb);
  const totalDetectionEfficiency = channelTransmittance * input.detectorEfficiency;
  const baseSignalDetectionProbability = 1 - Math.exp(-input.meanPhotonNumber * totalDetectionEfficiency);
  const baseNoiseDetectionProbability = input.darkCountProbability + input.backgroundCountProbability;
  const afterpulseNoiseProbability = clamp(
    input.afterpulseProbability * (baseSignalDetectionProbability + baseNoiseDetectionProbability),
    0,
    1
  );
  const preDeadTimeClickProbability = clamp(
    baseSignalDetectionProbability + baseNoiseDetectionProbability + afterpulseNoiseProbability,
    0,
    1
  );
  const deadTimeAvailabilityFactor = 1 / (1 + input.sourceRateHz * preDeadTimeClickProbability * input.detectorDeadTimeNs * 1e-9);
  const signalDetectionProbability = clamp(baseSignalDetectionProbability * deadTimeAvailabilityFactor, 0, 1);
  const noiseDetectionProbability = clamp((baseNoiseDetectionProbability + afterpulseNoiseProbability) * deadTimeAvailabilityFactor, 0, 1);
  const clickProbability = clamp(signalDetectionProbability + noiseDetectionProbability, 0, 1);
  const rawRateHz = input.sourceRateHz * clickProbability;
  const basisAgreementProbability =
    input.senderZBasisProbability * input.receiverZBasisProbability +
    (1 - input.senderZBasisProbability) * (1 - input.receiverZBasisProbability);
  const effectiveSiftingFactor = clamp(
    input.basisSiftingFactor * (basisAgreementProbability / 0.5),
    0,
    1
  );
  const siftedRateHz = rawRateHz * effectiveSiftingFactor;
  const qber = clamp(
    (input.misalignmentError * signalDetectionProbability + 0.5 * noiseDetectionProbability) /
      Math.max(clickProbability, EPSILON),
    0,
    0.5
  );
  const binaryEntropyQber = h2(qber);
  let secretFraction = Math.max(
    0,
    1 - input.reconciliationEfficiency * binaryEntropyQber - binaryEntropyQber
  );
  let decoyLowerBound: LinkBudgetResult["decoyLowerBound"];

  if (input.protocol === "decoy_bb84") {
    const qMu = clickProbability;
    const singlePhotonEmissionProbability = input.meanPhotonNumber * Math.exp(-input.meanPhotonNumber);
    const multiPhotonEmissionProbability = Math.max(0, 1 - Math.exp(-input.meanPhotonNumber) * (1 + input.meanPhotonNumber));
    const vacuumYieldProxy = noiseDetectionProbability;
    const singlePhotonYieldLowerBound = clamp(
      totalDetectionEfficiency + vacuumYieldProxy * (1 - totalDetectionEfficiency),
      0,
      1
    );
    const singlePhotonErrorUpperBound = clamp(
      (input.misalignmentError * totalDetectionEfficiency + 0.5 * vacuumYieldProxy + afterpulseNoiseProbability) /
        Math.max(singlePhotonYieldLowerBound, EPSILON),
      0,
      0.5
    );
    const singlePhotonGainLowerBound = singlePhotonEmissionProbability * singlePhotonYieldLowerBound;
    const lowerBoundRatePerPulse = effectiveSiftingFactor * Math.max(
      0,
      -qMu * input.reconciliationEfficiency * h2(qber) + singlePhotonGainLowerBound * (1 - h2(singlePhotonErrorUpperBound))
    );
    const lowerBoundSecretFraction =
      clickProbability > 0 ? clamp(lowerBoundRatePerPulse / Math.max(effectiveSiftingFactor * clickProbability, EPSILON), 0, 1) : 0;
    secretFraction = lowerBoundSecretFraction;
    decoyLowerBound = {
      signalGain: qMu,
      singlePhotonEmissionProbability,
      multiPhotonEmissionProbability,
      vacuumYieldProxy,
      singlePhotonYieldLowerBound,
      singlePhotonErrorUpperBound,
      singlePhotonGainLowerBound,
      singlePhotonContributionFraction: clickProbability > 0 ? clamp(singlePhotonGainLowerBound / clickProbability, 0, 1) : 0,
      lowerBoundSecretFraction,
      lowerBoundSecretKeyRateHz: input.sourceRateHz * lowerBoundRatePerPulse
    };
  }

  const secretKeyRateHz = siftedRateHz * secretFraction;
  const warnings: ModelWarning[] = [];

  if (qber >= 0.11) {
    warnings.push({
      code: "high-qber",
      severity: qber >= 0.18 ? "critical" : "warning",
      message: "QBER is at or above common ideal BB84 asymptotic thresholds; certified finite-key analysis would likely reject this block."
    });
  }
  if (clickProbability > 0.2) {
    warnings.push({
      code: "detector-saturation",
      severity: "warning",
      message: "Click probability is high enough that detector dead time and saturation materially shape the rate proxy; compare with calibrated hardware timing before treating this as feasible."
    });
  }
  if (deadTimeAvailabilityFactor < 0.98 && input.detectorDeadTimeNs > 0) {
    warnings.push({
      code: "dead-time-limited",
      severity: deadTimeAvailabilityFactor < 0.9 ? "warning" : "info",
      message: "The configured detector dead time suppresses the available click window, so the reported rate is a timing-limited teaching proxy."
    });
  }
  if (afterpulseNoiseProbability > baseNoiseDetectionProbability && input.afterpulseProbability > 0) {
    warnings.push({
      code: "afterpulse-dominated",
      severity: "warning",
      message: "Afterpulsing contributes more noise clicks than the configured dark and background counts in this proxy."
    });
  }
  if (Math.abs(input.senderZBasisProbability - input.receiverZBasisProbability) > 0.2) {
    warnings.push({
      code: "basis-bias-mismatch",
      severity: "info",
      message: "Sender and receiver basis biases differ noticeably, so sifted-rate changes here reflect basis-bookkeeping assumptions rather than calibrated protocol optimization."
    });
  }
  if (input.lengthKm > 200 && secretKeyRateHz > 0 && signalDetectionProbability < noiseDetectionProbability) {
    warnings.push({
      code: "noise-dominated",
      severity: "critical",
      message: "The nonzero key-rate proxy is noise dominated at long distance; treat it as a model-limit warning, not an achievable rate."
    });
  }
  if (input.protocol === "decoy_bb84") {
    warnings.push({
      code: "decoy-proxy",
      severity: "info",
      message: "Decoy-state BB84 uses a single-photon lower-bound teaching proxy rather than full decoy estimation or finite-key proof terms."
    });
    if (decoyLowerBound && decoyLowerBound.singlePhotonContributionFraction < 0.25) {
      warnings.push({
        code: "weak-single-photon-bound",
        severity: "warning",
        message: "The single-photon lower-bound contribution is small relative to total clicks, so the decoy-state teaching rate is dominated by the correction term."
      });
    }
    if (decoyLowerBound && decoyLowerBound.multiPhotonEmissionProbability > decoyLowerBound.singlePhotonEmissionProbability) {
      warnings.push({
        code: "multi-photon-heavy",
        severity: "info",
        message: "Multi-photon emissions exceed the single-photon Poisson mass in this pulse setting; treat the decoy lower bound as a cautionary teaching proxy."
      });
    }
  }

  return {
    input,
    result: {
      totalLossDb: round(totalLossDb, 6),
      channelTransmittance,
      totalDetectionEfficiency,
      baseSignalDetectionProbability,
      baseNoiseDetectionProbability,
      afterpulseNoiseProbability,
      deadTimeAvailabilityFactor,
      signalDetectionProbability,
      noiseDetectionProbability,
      clickProbability,
      rawRateHz,
      basisAgreementProbability: round(basisAgreementProbability, 8),
      effectiveSiftingFactor: round(effectiveSiftingFactor, 8),
      siftedRateHz,
      qber,
      binaryEntropyQber,
      secretFraction,
      secretKeyRateHz,
      decoyLowerBound
    },
    assumptions: LINK_BUDGET_ASSUMPTIONS,
    warnings,
    version: LINK_BUDGET_VERSION
  };
}

export function sweepLinkBudget(input: LinkBudgetInput, maxDistanceKm = 160, steps = 32) {
  const step = maxDistanceKm / steps;
  return Array.from({ length: steps + 1 }, (_, index) => {
    const lengthKm = round(index * step, 3);
    const response = computeLinkBudget({ ...input, lengthKm });
    return {
      distanceKm: lengthKm,
      totalLossDb: response.result.totalLossDb,
      qber: response.result.qber,
      secretKeyRateHz: response.result.secretKeyRateHz
    };
  });
}
