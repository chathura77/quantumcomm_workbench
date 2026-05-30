import { clamp, dbToLinear, EPSILON, round } from "@/lib/math";
import type { CvQkdDistanceSweepPoint, CvQkdInput, CvQkdResult, ModelWarning, SimulationResponse } from "@/lib/types";

export const CV_QKD_VERSION = "cv-qkd.teaching.v1";

export const CV_QKD_ASSUMPTIONS = [
  "This CV-QKD slice is a teaching estimator for Gaussian-modulated coherent-state links with scalar noise and reconciliation knobs.",
  "Shot-noise calibration, covariance estimation, finite-size composable security, local-oscillator architecture, and detector saturation are compressed into simple SNU noise terms and trust labels.",
  "The Eve information term is a lower-fidelity Holevo-style proxy, not a full symplectic-eigenvalue or covariance-matrix proof.",
  "Outputs are educational estimates for protocol comparison and parameter intuition, not deployment-grade CV-QKD certification."
];

function buildDistanceValues(maxDistanceKm: number, steps: number) {
  if (steps <= 1) {
    return [0];
  }

  const step = maxDistanceKm / (steps - 1);
  return Array.from({ length: steps }, (_, index) => round(step * index, 6));
}

function estimateCore(input: CvQkdInput): SimulationResponse<CvQkdInput, Omit<CvQkdResult, "distanceSweep">> {
  const totalLossDb = input.distanceKm * input.fiberLossDbPerKm + input.excessLossDb;
  const channelTransmittance = dbToLinear(totalLossDb);
  const effectiveDetectionEfficiency = clamp(
    channelTransmittance * input.detectorEfficiency * input.phaseRecoveryEfficiency,
    0,
    1
  );
  const detectionVacuumNoise = input.detectionMode === "heterodyne" ? 1 : 0;
  const lineNoiseSnu = clamp(((1 / Math.max(channelTransmittance, EPSILON)) - 1) + input.excessNoiseSnu + input.preparationNoiseSnu, 0, 1_000_000);
  const receiverAddedNoiseSnu = clamp(
    detectionVacuumNoise + input.electronicNoiseSnu / Math.max(input.detectorEfficiency * input.phaseRecoveryEfficiency, EPSILON),
    0,
    1_000_000
  );
  const trustedNoiseSnu = input.receiverTrustMode === "trusted_receiver" ? receiverAddedNoiseSnu : 0;
  const untrustedNoiseSnu = input.receiverTrustMode === "trusted_receiver"
    ? lineNoiseSnu
    : lineNoiseSnu + receiverAddedNoiseSnu;
  const totalNoiseSnu = lineNoiseSnu + receiverAddedNoiseSnu;
  const receivedQuadratureVarianceSnu = round(1 + effectiveDetectionEfficiency * input.modulationVarianceSnu + totalNoiseSnu, 8);
  const covarianceProxy = round(Math.sqrt(Math.max(effectiveDetectionEfficiency, 0)) * input.modulationVarianceSnu, 8);
  const correlationCoefficient = round(
    clamp(
      covarianceProxy / Math.sqrt(Math.max(input.modulationVarianceSnu * receivedQuadratureVarianceSnu, EPSILON)),
      0,
      1
    ),
    8
  );
  const snr = round(
    clamp(
      (effectiveDetectionEfficiency * input.modulationVarianceSnu) / Math.max(1 + totalNoiseSnu, EPSILON),
      0,
      1_000_000
    ),
    8
  );
  const quadratureFactor = input.detectionMode === "heterodyne" ? 1 : 0.5;
  const mutualInformationAB = round(quadratureFactor * Math.log2(1 + snr), 8);
  const holevoBoundProxy = round(
    clamp(
      quadratureFactor * Math.log2(1 + Math.max((1 - effectiveDetectionEfficiency) * input.modulationVarianceSnu + untrustedNoiseSnu, 0)),
      0,
      1_000_000
    ),
    8
  );
  const secretFractionPerUse = round(
    Math.max(0, input.reconciliationEfficiency * mutualInformationAB - holevoBoundProxy),
    8
  );
  const secretKeyRateHz = round(input.sourceRateHz * input.symbolUseFactor * secretFractionPerUse, 6);

  const warnings: ModelWarning[] = [
    {
      code: "teaching-model",
      severity: "info",
      message: "This CV-QKD output uses a covariance-style teaching proxy and does not replace calibrated covariance-matrix security analysis."
    }
  ];

  if (input.receiverTrustMode === "trusted_receiver") {
    warnings.push({
      code: "trusted-receiver",
      severity: "info",
      message: "Receiver electronics are treated as trusted noise here, which reduces the Eve-information proxy but adds a hardware-trust assumption."
    });
  } else {
    warnings.push({
      code: "untrusted-receiver",
      severity: "warning",
      message: "Receiver-added noise is treated as untrusted in the Eve-information proxy, making the result more conservative but still simplified."
    });
  }

  if (input.excessNoiseSnu >= 0.05) {
    warnings.push({
      code: "high-excess-noise",
      severity: input.excessNoiseSnu >= 0.1 ? "warning" : "info",
      message: "Excess noise is high for a classroom CV-QKD link; secure reconciliation margins may disappear quickly as distance increases."
    });
  }

  if (snr < 0.2) {
    warnings.push({
      code: "low-snr",
      severity: snr < 0.05 ? "critical" : "warning",
      message: "Signal-to-noise ratio is very low, so reconciliation and parameter-estimation fragility would dominate a more realistic CV-QKD analysis."
    });
  }

  if (input.phaseRecoveryEfficiency < 0.9) {
    warnings.push({
      code: "phase-recovery",
      severity: input.phaseRecoveryEfficiency < 0.75 ? "warning" : "info",
      message: "Phase-reference recovery is lossy in this setup, so coherent-detection correlation and key-rate proxies are penalized."
    });
  }

  if (secretKeyRateHz === 0) {
    warnings.push({
      code: "zero-rate",
      severity: "info",
      message: "Current loss, trust, and noise assumptions leave no positive CV-QKD teaching key margin."
    });
  }

  return {
    input,
    result: {
      totalLossDb: round(totalLossDb, 6),
      channelTransmittance: round(channelTransmittance, 8),
      effectiveDetectionEfficiency: round(effectiveDetectionEfficiency, 8),
      lineNoiseSnu: round(lineNoiseSnu, 8),
      receiverAddedNoiseSnu: round(receiverAddedNoiseSnu, 8),
      trustedNoiseSnu: round(trustedNoiseSnu, 8),
      untrustedNoiseSnu: round(untrustedNoiseSnu, 8),
      totalNoiseSnu: round(totalNoiseSnu, 8),
      receivedQuadratureVarianceSnu,
      covarianceProxy,
      correlationCoefficient,
      snr,
      mutualInformationAB,
      holevoBoundProxy,
      secretFractionPerUse,
      secretKeyRateHz
    },
    assumptions: [
      ...CV_QKD_ASSUMPTIONS,
      "Channel transmittance uses eta = 10^(-loss_dB / 10) with excess insertion loss separated from fiber attenuation.",
      "Total receiver efficiency multiplies channel transmittance, detector efficiency, and phase-recovery efficiency into one observable correlation term.",
      "Line noise is reported in shot-noise units (SNU) and combines vacuum loss, excess noise, and preparation noise into an input-referred teaching term.",
      "Receiver-added noise includes electronic-noise calibration and the extra heterodyne vacuum unit when heterodyne detection is selected.",
      "The key-rate proxy uses R = R_src u max(0, beta I_AB - chi_BE,proxy), where I_AB and chi_BE,proxy are cautious teaching approximations."
    ],
    warnings,
    version: CV_QKD_VERSION
  };
}

function buildDistanceSweep(input: CvQkdInput): CvQkdDistanceSweepPoint[] {
  const maxDistanceKm = Math.max(20, input.distanceKm * 1.6, input.distanceKm + 40);

  return buildDistanceValues(maxDistanceKm, 15).map((distanceKm) => {
    const response = estimateCore({ ...input, distanceKm });
    return {
      distanceKm,
      snr: response.result.snr,
      totalNoiseSnu: response.result.totalNoiseSnu,
      mutualInformationAB: response.result.mutualInformationAB,
      holevoBoundProxy: response.result.holevoBoundProxy,
      secretKeyRateHz: response.result.secretKeyRateHz
    };
  });
}

export function estimateCvQkd(input: CvQkdInput): SimulationResponse<CvQkdInput, CvQkdResult> {
  const response = estimateCore(input);

  return {
    ...response,
    result: {
      ...response.result,
      distanceSweep: buildDistanceSweep(input)
    }
  };
}
