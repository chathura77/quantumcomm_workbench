import { describe, expect, it } from "vitest";
import { h2 } from "../lib/math";
import { runAttackModel } from "../lib/qkd/attacks";
import { estimateCvQkd } from "../lib/qkd/cvQkd";
import { estimateEntanglementQkd } from "../lib/qkd/entanglementQkd";
import { estimateFiniteKeyBb84 } from "../lib/qkd/finiteKeyBb84";
import { computeLinkBudget } from "../lib/qkd/linkBudget";
import { estimateMdiQkd } from "../lib/qkd/mdiQkd";
import { estimatePostProcessing } from "../lib/qkd/postProcessing";
import { analyzeQber } from "../lib/qkd/qber";
import { estimateTwinFieldQkd } from "../lib/qkd/twinFieldQkd";
import type { CvQkdInput, EntanglementQkdInput, LinkBudgetInput, PostProcessingInput, TwinFieldQkdInput } from "../lib/types";

const baseLink: LinkBudgetInput = {
  protocol: "bb84",
  lengthKm: 25,
  fiberLossDbPerKm: 0.2,
  connectorLossDb: 3,
  sourceRateHz: 1000000000,
  meanPhotonNumber: 0.4,
  detectorEfficiency: 0.25,
  darkCountProbability: 0.000001,
  backgroundCountProbability: 0.000002,
  misalignmentError: 0.015,
  basisSiftingFactor: 0.5,
  senderZBasisProbability: 0.5,
  receiverZBasisProbability: 0.5,
  detectorDeadTimeNs: 0,
  afterpulseProbability: 0,
  reconciliationEfficiency: 1.16,
  blockSize: 1000000
};

const baseEntanglement: EntanglementQkdInput = {
  protocol: "e91",
  aliceLengthKm: 15,
  bobLengthKm: 15,
  fiberLossDbPerKm: 0.2,
  aliceInsertionLossDb: 2.5,
  bobInsertionLossDb: 2.5,
  pairGenerationRateHz: 80000000,
  pairEmissionProbability: 0.06,
  sourceVisibility: 0.985,
  sourceBellStateFidelity: 0.97,
  detectorEfficiencyAlice: 0.75,
  detectorEfficiencyBob: 0.75,
  darkCountProbabilityAlice: 0.000001,
  darkCountProbabilityBob: 0.000001,
  backgroundCountProbabilityAlice: 0.000001,
  backgroundCountProbabilityBob: 0.000001,
  coincidenceWindowNs: 1,
  misalignmentError: 0.01,
  basisSiftingFactor: 0.5,
  bellTestFraction: 0.2,
  reconciliationEfficiency: 1.14,
  blockSize: 1000000
};

describe("binary entropy", () => {
  it("handles endpoints and midpoint", () => {
    expect(h2(0)).toBe(0);
    expect(h2(1)).toBe(0);
    expect(h2(0.5)).toBeCloseTo(1, 8);
    expect(Number.isNaN(h2(1e-12))).toBe(false);
  });
});

describe("link budget", () => {
  it("decreases rate with distance and loss", () => {
    const near = computeLinkBudget({ ...baseLink, lengthKm: 0 });
    const far = computeLinkBudget({ ...baseLink, lengthKm: 100 });
    expect(near.result.secretKeyRateHz).toBeGreaterThan(far.result.secretKeyRateHz);
    expect(computeLinkBudget({ ...baseLink, fiberLossDbPerKm: 0.4 }).result.channelTransmittance).toBeLessThan(baseLinkResult().result.channelTransmittance);
  });

  it("increases QBER with dark counts and warns above threshold", () => {
    const lowDark = computeLinkBudget({ ...baseLink, darkCountProbability: 0.000001 });
    const highDark = computeLinkBudget({ ...baseLink, darkCountProbability: 0.05 });
    expect(highDark.result.qber).toBeGreaterThan(lowDark.result.qber);
    expect(highDark.result.secretFraction).toBe(0);
    expect(highDark.warnings.some((warning) => warning.code === "high-qber")).toBe(true);
  });

  it("captures dead-time, afterpulse, and basis-bias proxies", () => {
    const baseline = computeLinkBudget(baseLink);
    const deadTimeLimited = computeLinkBudget({ ...baseLink, detectorDeadTimeNs: 500 });
    const afterpulseHeavy = computeLinkBudget({ ...baseLink, afterpulseProbability: 0.05 });
    const biased = computeLinkBudget({
      ...baseLink,
      senderZBasisProbability: 0.8,
      receiverZBasisProbability: 0.8
    });

    expect(deadTimeLimited.result.rawRateHz).toBeLessThan(baseline.result.rawRateHz);
    expect(deadTimeLimited.result.deadTimeAvailabilityFactor).toBeLessThan(1);
    expect(afterpulseHeavy.result.qber).toBeGreaterThan(baseline.result.qber);
    expect(afterpulseHeavy.result.afterpulseNoiseProbability).toBeGreaterThan(0);
    expect(biased.result.effectiveSiftingFactor).toBeGreaterThan(baseline.result.effectiveSiftingFactor);
    expect(biased.result.basisAgreementProbability).toBeGreaterThan(0.5);
  });
});

function baseLinkResult() {
  return computeLinkBudget(baseLink);
}

describe("QBER forensics", () => {
  it("adds intercept-resend contribution and conserves residual accounting", () => {
    const response = analyzeQber({
      measuredQber: 0.3,
      misalignmentError: 0,
      visibility: 1,
      darkCountProbability: 0,
      backgroundCountProbability: 0,
      detectorMismatch: 0,
      eveInterceptFraction: 1,
      signalDetectionProbability: 0.1
    });
    expect(response.result.contributions.find((item) => item.id === "intercept-resend")?.qberContribution).toBeCloseTo(0.25);
    expect(response.result.modeledQber + response.result.residualQber).toBeCloseTo(response.result.measuredQber);
  });
});

describe("post-processing", () => {
  const input: PostProcessingInput = {
    rawDetections: 1000000,
    basisSiftingFactor: 0.5,
    qber: 0.02,
    sampleFraction: 0.1,
    reconciliationEfficiency: 1.16,
    verificationBits: 128,
    authenticationBits: 256,
    securityMarginBits: 1024
  };

  it("never goes negative and decreases with QBER/authentication cost", () => {
    const low = estimatePostProcessing(input);
    const highQber = estimatePostProcessing({ ...input, qber: 0.09 });
    const highAuth = estimatePostProcessing({ ...input, authenticationBits: 10000 });
    expect(low.result.finalKeyBits).toBeGreaterThanOrEqual(0);
    expect(highQber.result.finalKeyBits).toBeLessThanOrEqual(low.result.finalKeyBits);
    expect(highAuth.result.finalKeyBits).toBeLessThan(low.result.finalKeyBits);
  });
});

describe("attack explorer", () => {
  it("risk proxies move in expected directions", () => {
    const lowEve = runAttackModel({ attackType: "intercept_resend", parameters: { eveInterceptFraction: 0.1 } });
    const highEve = runAttackModel({ attackType: "intercept_resend", parameters: { eveInterceptFraction: 0.9 } });
    expect(Number(highEve.result.metrics.qberAdded)).toBeGreaterThan(Number(lowEve.result.metrics.qberAdded));

    const lowMu = runAttackModel({ attackType: "pns_risk", parameters: { meanPhotonNumber: 0.1, channelLossAdvantageFactor: 1, decoyStateEnabled: false } });
    const highMu = runAttackModel({ attackType: "pns_risk", parameters: { meanPhotonNumber: 1, channelLossAdvantageFactor: 1, decoyStateEnabled: false } });
    expect(Number(highMu.result.metrics.riskProxy)).toBeGreaterThan(Number(lowMu.result.metrics.riskProxy));

    const lowBg = runAttackModel({ attackType: "dos_background", parameters: { backgroundCountProbability: 0.000001 } });
    const highBg = runAttackModel({ attackType: "dos_background", parameters: { backgroundCountProbability: 0.1 } });
    expect(Number(highBg.result.metrics.qberNoise)).toBeGreaterThan(Number(lowBg.result.metrics.qberNoise));
  });
});

describe("finite-key BB84", () => {
  it("surfaces the shared hardware proxy outputs", () => {
    const response = estimateFiniteKeyBb84({
      ...baseLink,
      protocol: "bb84",
      sampleFraction: 0.1,
      epsilonCorrectness: 1e-12,
      epsilonSecrecy: 1e-10,
      epsilonParameterEstimation: 1e-9,
      detectorDeadTimeNs: 250,
      afterpulseProbability: 0.03,
      senderZBasisProbability: 0.75,
      receiverZBasisProbability: 0.75
    });

    expect(response.result.deadTimeAvailabilityFactor).toBeLessThan(1);
    expect(response.result.afterpulseNoiseProbability).toBeGreaterThan(0);
    expect(response.result.effectiveSiftingFactor).toBeGreaterThan(baseLink.basisSiftingFactor);
    expect(response.warnings.some((warning) => warning.code === "hardware-proxy")).toBe(true);
  });
});

describe("MDI-QKD", () => {
  it("penalizes imbalanced relay arms and noisy interference", () => {
    const balanced = estimateMdiQkd({
      relayMode: "untrusted",
      aliceLengthKm: 25,
      bobLengthKm: 25,
      fiberLossDbPerKm: 0.2,
      aliceConnectorLossDb: 3,
      bobConnectorLossDb: 3,
      sourceRateHz: 1_000_000_000,
      aliceMeanPhotonNumber: 0.35,
      bobMeanPhotonNumber: 0.35,
      relayDetectorEfficiency: 0.65,
      relayDarkCountProbability: 0.000001,
      backgroundCountProbability: 0.000002,
      interferenceVisibility: 0.97,
      misalignmentError: 0.015,
      bellStateMeasurementEfficiency: 0.5,
      basisSiftingFactor: 0.5,
      reconciliationEfficiency: 1.16,
      blockSize: 1_000_000
    });
    const imbalanced = estimateMdiQkd({
      ...balanced.input,
      aliceLengthKm: 5,
      bobLengthKm: 45
    });
    const lowerVisibility = estimateMdiQkd({
      ...balanced.input,
      interferenceVisibility: 0.8
    });

    expect(imbalanced.result.symmetryRatio).toBeLessThan(balanced.result.symmetryRatio);
    expect(imbalanced.result.secretKeyRateHz).toBeLessThanOrEqual(balanced.result.secretKeyRateHz);
    expect(lowerVisibility.result.qber).toBeGreaterThan(balanced.result.qber);
    expect(lowerVisibility.warnings.some((warning) => warning.code === "low-visibility")).toBe(true);
    expect(balanced.result.distanceSweep.length).toBeGreaterThanOrEqual(10);
  });
});

describe("CV-QKD", () => {
  const baseCv: CvQkdInput = {
    detectionMode: "homodyne",
    receiverTrustMode: "trusted_receiver",
    distanceKm: 25,
    fiberLossDbPerKm: 0.2,
    excessLossDb: 2,
    sourceRateHz: 100000000,
    modulationVarianceSnu: 6,
    reconciliationEfficiency: 0.96,
    excessNoiseSnu: 0.01,
    preparationNoiseSnu: 0.005,
    detectorEfficiency: 0.7,
    electronicNoiseSnu: 0.03,
    phaseRecoveryEfficiency: 0.96,
    symbolUseFactor: 0.9
  };

  it("penalizes excess noise and low reconciliation efficiency", () => {
    const baseline = estimateCvQkd(baseCv);
    const noisier = estimateCvQkd({ ...baseCv, excessNoiseSnu: 0.08 });
    const lowerBeta = estimateCvQkd({ ...baseCv, reconciliationEfficiency: 0.85 });

    expect(noisier.result.totalNoiseSnu).toBeGreaterThan(baseline.result.totalNoiseSnu);
    expect(noisier.result.snr).toBeLessThan(baseline.result.snr);
    expect(noisier.result.secretKeyRateHz).toBeLessThanOrEqual(baseline.result.secretKeyRateHz);
    expect(lowerBeta.result.secretKeyRateHz).toBeLessThanOrEqual(baseline.result.secretKeyRateHz);
    expect(noisier.warnings.some((warning) => warning.code === "high-excess-noise")).toBe(true);
  });

  it("tracks receiver trust assumptions in the Eve-information proxy", () => {
    const trusted = estimateCvQkd(baseCv);
    const untrusted = estimateCvQkd({ ...baseCv, receiverTrustMode: "untrusted_receiver" });

    expect(untrusted.result.holevoBoundProxy).toBeGreaterThanOrEqual(trusted.result.holevoBoundProxy);
    expect(untrusted.result.untrustedNoiseSnu).toBeGreaterThan(trusted.result.untrustedNoiseSnu);
    expect(trusted.result.trustedNoiseSnu).toBeGreaterThan(0);
    expect(untrusted.result.trustedNoiseSnu).toBe(0);
    expect(untrusted.result.distanceSweep.length).toBeGreaterThanOrEqual(10);
  });
});

describe("twin-field QKD", () => {
  const baseTwinField: TwinFieldQkdInput = {
    stationMode: "untrusted",
    aliceLengthKm: 75,
    bobLengthKm: 75,
    fiberLossDbPerKm: 0.18,
    aliceConnectorLossDb: 2.5,
    bobConnectorLossDb: 2.5,
    sourceRateHz: 500000000,
    aliceMeanPhotonNumber: 0.2,
    bobMeanPhotonNumber: 0.2,
    middleStationDetectorEfficiency: 0.72,
    darkCountProbability: 0.000001,
    backgroundCountProbability: 0.000002,
    interferenceVisibility: 0.985,
    phaseTrackingEfficiency: 0.96,
    phaseErrorSigmaRad: 0.12,
    phasePostSelectionFraction: 0.85,
    basisSiftingFactor: 0.5,
    reconciliationEfficiency: 1.12,
    blockSize: 1_000_000
  };

  it("penalizes weak phase control and arm imbalance", () => {
    const baseline = estimateTwinFieldQkd(baseTwinField);
    const unstable = estimateTwinFieldQkd({
      ...baseTwinField,
      phaseTrackingEfficiency: 0.75,
      phaseErrorSigmaRad: 0.45
    });
    const imbalanced = estimateTwinFieldQkd({
      ...baseTwinField,
      aliceLengthKm: 40,
      bobLengthKm: 110
    });

    expect(unstable.result.phaseStabilityFactor).toBeLessThan(baseline.result.phaseStabilityFactor);
    expect(unstable.result.secretKeyRateHz).toBeLessThanOrEqual(baseline.result.secretKeyRateHz);
    expect(unstable.warnings.some((warning) => warning.code === "phase-instability")).toBe(true);
    expect(imbalanced.result.symmetryRatio).toBeLessThan(baseline.result.symmetryRatio);
    expect(imbalanced.result.interferencePenalty).toBeLessThanOrEqual(baseline.result.interferencePenalty);
    expect(baseline.result.distanceSweep.length).toBeGreaterThanOrEqual(10);
  });
});

describe("entanglement-based QKD", () => {
  it("penalizes low visibility and long distances while separating E91 monitoring from BBM92", () => {
    const e91 = estimateEntanglementQkd(baseEntanglement);
    const lowVisibility = estimateEntanglementQkd({ ...baseEntanglement, sourceVisibility: 0.8, sourceBellStateFidelity: 0.88 });
    const longer = estimateEntanglementQkd({ ...baseEntanglement, aliceLengthKm: 35, bobLengthKm: 35 });
    const bbm92 = estimateEntanglementQkd({ ...baseEntanglement, protocol: "bbm92", bellTestFraction: 0.05 });

    expect(lowVisibility.result.qber).toBeGreaterThan(e91.result.qber);
    expect(lowVisibility.result.chshScore).toBeLessThan(e91.result.chshScore);
    expect(longer.result.secretKeyRateHz).toBeLessThanOrEqual(e91.result.secretKeyRateHz);
    expect(bbm92.result.keyGenerationFraction).toBeGreaterThan(e91.result.keyGenerationFraction);
    expect(lowVisibility.warnings.some((warning) => warning.code === "low-visibility")).toBe(true);
    expect(e91.result.distanceSweep.length).toBeGreaterThanOrEqual(10);
  });
});
