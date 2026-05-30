import { clamp, EPSILON } from "@/lib/math";
import type { ModelWarning, QberContribution, QberForensicsInput, QberForensicsResult, SimulationResponse } from "@/lib/types";

export const QBER_FORENSICS_VERSION = "qber-forensics.simplified.v1";

export function analyzeQber(input: QberForensicsInput): SimulationResponse<QberForensicsInput, QberForensicsResult> {
  const noiseDenominator = Math.max(
    input.signalDetectionProbability + input.darkCountProbability + input.backgroundCountProbability,
    EPSILON
  );
  const contributions: QberContribution[] = [
    {
      id: "misalignment",
      label: "Calibration and misalignment",
      qberContribution: input.misalignmentError,
      explanation: "Proxy for polarization, phase, basis, or timing misalignment."
    },
    {
      id: "visibility",
      label: "Visibility or mode mismatch",
      qberContribution: Math.max(0, (1 - input.visibility) / 2),
      explanation: "Low interference visibility maps to a symmetric error contribution."
    },
    {
      id: "noise",
      label: "Dark/background counts",
      qberContribution: 0.5 * (input.darkCountProbability + input.backgroundCountProbability) / noiseDenominator,
      explanation: "Noise clicks are assigned random bit values in this simplified additive model."
    },
    {
      id: "detector-mismatch",
      label: "Detector efficiency mismatch",
      qberContribution: 0.5 * input.detectorMismatch,
      explanation: "Mismatch is represented as a bounded symmetric bias proxy."
    },
    {
      id: "intercept-resend",
      label: "Intercept-resend disturbance",
      qberContribution: 0.25 * input.eveInterceptFraction,
      explanation: "Educational BB84 intercept-resend contribution; not an operational attack recipe."
    }
  ];
  const modeledQber = clamp(contributions.reduce((sum, contribution) => sum + contribution.qberContribution, 0), 0, 0.5);
  const residualQber = input.measuredQber - modeledQber;
  const likelyCauses: string[] = [];

  if (input.misalignmentError > 0.02) likelyCauses.push("polarization or phase calibration drift");
  if (contributions[2].qberContribution > 0.02) likelyCauses.push("dark counts, background light, filtering, or timing gate width");
  if (contributions[1].qberContribution > 0.02) likelyCauses.push("interferometer visibility or spatial/temporal mode mismatch");
  if (input.detectorMismatch > 0.08) likelyCauses.push("detector efficiency mismatch requiring characterization");
  if (input.eveInterceptFraction > 0.1) likelyCauses.push("simulation-only intercept-resend disturbance");
  if (residualQber > 0.01) likelyCauses.push("unmodeled device imperfection, calibration drift, or adversarial disturbance");
  if (likelyCauses.length === 0) likelyCauses.push("no dominant contribution in the simplified model");

  const warnings: ModelWarning[] = [];
  if (Math.abs(residualQber) > 0.03) {
    warnings.push({
      code: "large-residual",
      severity: "warning",
      message: "A large residual means the additive model is missing meaningful physics or calibration data."
    });
  }

  return {
    input,
    result: {
      measuredQber: input.measuredQber,
      modeledQber,
      residualQber,
      contributions,
      likelyCauses
    },
    assumptions: [
      "QBER contributions are additive proxies and are clamped to [0, 0.5].",
      "Noise clicks are modeled as random bit values.",
      "Intercept-resend is included only as an educational disturbance model."
    ],
    warnings,
    version: QBER_FORENSICS_VERSION
  };
}
