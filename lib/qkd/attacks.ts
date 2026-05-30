import { clamp, EPSILON } from "@/lib/math";
import type { AttackInput, AttackResult, ModelWarning, SimulationResponse } from "@/lib/types";

export const ATTACK_MODEL_VERSION = "qkd-attack-explorer.simplified.v1";

function numberParam(parameters: AttackInput["parameters"], key: string, fallback: number): number {
  const value = parameters[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanParam(parameters: AttackInput["parameters"], key: string, fallback: boolean): boolean {
  const value = parameters[key];
  return typeof value === "boolean" ? value : fallback;
}

function riskFrom(value: number): "low" | "medium" | "high" {
  if (value >= 0.5) return "high";
  if (value >= 0.15) return "medium";
  return "low";
}

export function runAttackModel(input: AttackInput): SimulationResponse<AttackInput, AttackResult> {
  let result: AttackResult;

  if (input.attackType === "intercept_resend") {
    const eveInterceptFraction = clamp(numberParam(input.parameters, "eveInterceptFraction", 0.1), 0, 1);
    const sampleSize = Math.max(1, numberParam(input.parameters, "sampleSize", 10000));
    const detectionThreshold = clamp(numberParam(input.parameters, "detectionThreshold", 0.03), 0, 0.5);
    const qberAdded = 0.25 * eveInterceptFraction;
    const informationLeakProxy = 0.5 * eveInterceptFraction;
    const abortProbabilityProxy = 1 - Math.exp(-sampleSize * Math.max(0, qberAdded - detectionThreshold) ** 2);
    result = {
      metrics: { qberAdded, informationLeakProxy, abortProbabilityProxy },
      riskLevel: riskFrom(Math.max(qberAdded, informationLeakProxy, abortProbabilityProxy)),
      explanation: "Intercept-resend is modeled only as an educational disturbance that raises QBER and can trigger aborts.",
      countermeasureConcepts: ["Authenticated basis reconciliation", "QBER thresholding", "Privacy amplification", "Device characterization"]
    };
  } else if (input.attackType === "pns_risk") {
    const meanPhotonNumber = clamp(numberParam(input.parameters, "meanPhotonNumber", 0.4), 0, 5);
    const channelLossAdvantageFactor = clamp(numberParam(input.parameters, "channelLossAdvantageFactor", 0.5), 0, 2);
    const decoyStateEnabled = booleanParam(input.parameters, "decoyStateEnabled", true);
    const pMultiPhoton = 1 - Math.exp(-meanPhotonNumber) * (1 + meanPhotonNumber);
    const riskProxy = pMultiPhoton * channelLossAdvantageFactor * (decoyStateEnabled ? 0.25 : 1);
    result = {
      metrics: { pMultiPhoton, riskProxy, decoyStateEnabled },
      riskLevel: riskFrom(riskProxy),
      explanation: "The PNS indicator tracks multi-photon probability for weak coherent pulses and shows the mitigating effect of decoy states.",
      countermeasureConcepts: ["Decoy-state intensity monitoring", "Single-photon source research", "Tight source characterization"]
    };
  } else if (input.attackType === "detector_mismatch") {
    const eta0 = clamp(numberParam(input.parameters, "eta0", 0.2), 0, 1);
    const eta1 = clamp(numberParam(input.parameters, "eta1", 0.18), 0, 1);
    const timingShiftFraction = clamp(numberParam(input.parameters, "timingShiftFraction", 0.2), 0, 1);
    const biasProxy = Math.abs(eta0 - eta1) / Math.max(eta0 + eta1, EPSILON);
    const qberProxy = 0.5 * timingShiftFraction * biasProxy;
    result = {
      metrics: { biasProxy, qberProxy, eta0, eta1 },
      riskLevel: riskFrom(Math.max(biasProxy, qberProxy)),
      explanation: "Detector mismatch is represented as a bounded bias proxy, not a device exploit procedure.",
      countermeasureConcepts: ["Detector calibration", "Measurement-device-independent protocols", "Timing randomization", "Monitoring efficiency imbalance"]
    };
  } else if (input.attackType === "trojan_horse_risk") {
    const probePhotons = Math.max(0, numberParam(input.parameters, "probePhotons", 1000));
    const backReflection = clamp(numberParam(input.parameters, "backReflection", 1e-6), 0, 1);
    const isolationDb = Math.max(0, numberParam(input.parameters, "isolationDb", 60));
    const monitoringProbability = clamp(numberParam(input.parameters, "monitoringProbability", 0.9), 0, 1);
    const returnedPhotonProxy = probePhotons * backReflection * 10 ** (-isolationDb / 10);
    const riskProxy = returnedPhotonProxy * (1 - monitoringProbability);
    result = {
      metrics: { returnedPhotonProxy, riskProxy, monitoringProbability },
      riskLevel: riskFrom(riskProxy),
      explanation: "Trojan-horse leakage is shown as a high-level leakage accounting model with no operational optical instructions.",
      countermeasureConcepts: ["Optical isolation", "Watchdog monitoring", "Spectral filtering", "Source encapsulation and audits"]
    };
  } else {
    const backgroundCountProbability = clamp(numberParam(input.parameters, "backgroundCountProbability", 0.0001), 0, 1);
    const darkCountProbability = clamp(numberParam(input.parameters, "darkCountProbability", 0.000001), 0, 1);
    const signalDetectionProbability = clamp(numberParam(input.parameters, "signalDetectionProbability", 0.02), 0, 1);
    const secretKeyRateNoNoise = Math.max(EPSILON, numberParam(input.parameters, "secretKeyRateNoNoise", 1000));
    const noiseProbability = backgroundCountProbability + darkCountProbability;
    const qberNoise = 0.5 * noiseProbability / Math.max(signalDetectionProbability + noiseProbability, EPSILON);
    const secretKeyRateWithNoise = secretKeyRateNoNoise * Math.max(0, 1 - qberNoise / 0.11);
    const rateCollapse = Math.max(0, 1 - secretKeyRateWithNoise / Math.max(secretKeyRateNoNoise, EPSILON));
    result = {
      metrics: { noiseProbability, qberNoise, secretKeyRateWithNoise, rateCollapse },
      riskLevel: riskFrom(Math.max(qberNoise, rateCollapse)),
      explanation: "Background-light denial of service is modeled as noise-induced QBER and rate collapse, not as operational guidance.",
      countermeasureConcepts: ["Narrow timing gates", "Spectral filtering", "Power monitoring", "Fail-closed service policies"]
    };
  }

  const warnings: ModelWarning[] = [{
    code: "simulation-only",
    severity: "info",
    message: "Attack explorer outputs are educational risk proxies and do not describe how to attack deployed systems."
  }];

  return {
    input,
    result,
    assumptions: [
      "Each module uses a simplified scalar risk proxy.",
      "Countermeasures are conceptual and require hardware-specific security analysis.",
      "No production attack instructions or deployed-system procedures are provided."
    ],
    warnings,
    version: ATTACK_MODEL_VERSION
  };
}
