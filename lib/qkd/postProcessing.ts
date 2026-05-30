import { h2 } from "@/lib/math";
import type { ModelWarning, PostProcessingInput, PostProcessingResult, SimulationResponse } from "@/lib/types";

export const POST_PROCESSING_VERSION = "qkd-post-processing.simplified.v1";

export function estimatePostProcessing(input: PostProcessingInput): SimulationResponse<PostProcessingInput, PostProcessingResult> {
  const siftedBits = Math.floor(input.rawDetections * input.basisSiftingFactor);
  const parameterEstimationBits = Math.floor(siftedBits * input.sampleFraction);
  const remainingSiftedBits = Math.max(0, siftedBits - parameterEstimationBits);
  const reconciliationLeakageBits = Math.ceil(input.reconciliationEfficiency * remainingSiftedBits * h2(input.qber));
  const phaseErrorCostBits = Math.ceil(remainingSiftedBits * h2(input.qber));
  const finalKeyBits = Math.max(
    0,
    remainingSiftedBits -
      reconciliationLeakageBits -
      phaseErrorCostBits -
      input.verificationBits -
      input.authenticationBits -
      input.securityMarginBits
  );
  const warnings: ModelWarning[] = [];

  if (input.qber >= 0.11) {
    warnings.push({
      code: "high-qber",
      severity: "warning",
      message: "The simplified final key length may collapse at this QBER; full security proofs can be stricter."
    });
  }
  if (finalKeyBits === 0) {
    warnings.push({
      code: "zero-key",
      severity: "info",
      message: "Accounting costs consume the sifted block under these assumptions."
    });
  }

  const stages = [
    { stage: "Raw detections", beforeBits: input.rawDetections, afterBits: input.rawDetections, note: "Detector clicks entering post-processing." },
    { stage: "Basis sifting", beforeBits: input.rawDetections, afterBits: siftedBits, note: "Discard mismatched basis events." },
    { stage: "Parameter estimation", beforeBits: siftedBits, afterBits: remainingSiftedBits, note: "Reveal a sample to estimate QBER." },
    { stage: "Information reconciliation", beforeBits: remainingSiftedBits, afterBits: Math.max(0, remainingSiftedBits - reconciliationLeakageBits), note: "Leakage estimated from f_ec h2(Q)." },
    { stage: "Error verification", beforeBits: Math.max(0, remainingSiftedBits - reconciliationLeakageBits), afterBits: Math.max(0, remainingSiftedBits - reconciliationLeakageBits - input.verificationBits), note: "Hash/checksum accounting." },
    { stage: "Authentication", beforeBits: Math.max(0, remainingSiftedBits - reconciliationLeakageBits - input.verificationBits), afterBits: Math.max(0, remainingSiftedBits - reconciliationLeakageBits - input.verificationBits - input.authenticationBits), note: "Classical channel authentication cost." },
    { stage: "Privacy amplification", beforeBits: Math.max(0, remainingSiftedBits - reconciliationLeakageBits - input.verificationBits - input.authenticationBits), afterBits: finalKeyBits, note: "Remove phase-error proxy and security margin." }
  ];

  return {
    input,
    result: {
      siftedBits,
      parameterEstimationBits,
      remainingSiftedBits,
      reconciliationLeakageBits,
      phaseErrorCostBits,
      verificationCostBits: input.verificationBits,
      authenticationCostBits: input.authenticationBits,
      securityMarginBits: input.securityMarginBits,
      finalKeyBits,
      finalKeyFractionOfRaw: input.rawDetections > 0 ? finalKeyBits / input.rawDetections : 0,
      stages
    },
    assumptions: [
      "Sifting is a fixed multiplicative factor.",
      "Reconciliation leakage is f_ec * remaining bits * h2(Q).",
      "Privacy amplification uses the same h2(Q) proxy for phase-error cost."
    ],
    warnings,
    version: POST_PROCESSING_VERSION
  };
}
