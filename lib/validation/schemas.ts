import { z } from "zod";

export const qkdProtocolSchema = z.enum([
  "bb84",
  "decoy_bb84",
  "e91",
  "bbm92",
  "mdi_qkd",
  "tf_qkd",
  "cv_qkd"
]);

export const modelWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["info", "warning", "critical"])
});

export const linkBudgetInputSchema = z.object({
  protocol: qkdProtocolSchema,
  lengthKm: z.number().min(0).max(10000),
  fiberLossDbPerKm: z.number().min(0).max(10),
  connectorLossDb: z.number().min(0).max(100),
  sourceRateHz: z.number().min(1),
  meanPhotonNumber: z.number().min(0).max(10),
  detectorEfficiency: z.number().min(0).max(1),
  darkCountProbability: z.number().min(0).max(1),
  backgroundCountProbability: z.number().min(0).max(1),
  misalignmentError: z.number().min(0).max(0.5),
  basisSiftingFactor: z.number().min(0).max(1),
  senderZBasisProbability: z.number().min(0).max(1),
  receiverZBasisProbability: z.number().min(0).max(1),
  detectorDeadTimeNs: z.number().min(0).max(1_000_000_000),
  afterpulseProbability: z.number().min(0).max(0.5),
  reconciliationEfficiency: z.number().min(1).max(5),
  blockSize: z.number().int().min(1)
});

export const finiteKeyBb84InputSchema = linkBudgetInputSchema.extend({
  protocol: z.enum(["bb84", "decoy_bb84"]),
  sampleFraction: z.number().min(0.001).max(0.5),
  epsilonCorrectness: z.number().gt(0).lt(0.1),
  epsilonSecrecy: z.number().gt(0).lt(0.1),
  epsilonParameterEstimation: z.number().gt(0).lt(0.1)
});

export const mdiQkdInputSchema = z.object({
  relayMode: z.enum(["untrusted", "monitored"]),
  aliceLengthKm: z.number().min(0).max(10000),
  bobLengthKm: z.number().min(0).max(10000),
  fiberLossDbPerKm: z.number().min(0).max(10),
  aliceConnectorLossDb: z.number().min(0).max(100),
  bobConnectorLossDb: z.number().min(0).max(100),
  sourceRateHz: z.number().min(1),
  aliceMeanPhotonNumber: z.number().min(0).max(10),
  bobMeanPhotonNumber: z.number().min(0).max(10),
  relayDetectorEfficiency: z.number().min(0).max(1),
  relayDarkCountProbability: z.number().min(0).max(1),
  backgroundCountProbability: z.number().min(0).max(1),
  interferenceVisibility: z.number().min(0).max(1),
  misalignmentError: z.number().min(0).max(0.5),
  bellStateMeasurementEfficiency: z.number().min(0).max(1),
  basisSiftingFactor: z.number().min(0).max(1),
  reconciliationEfficiency: z.number().min(1).max(5),
  blockSize: z.number().int().min(1)
});

export const twinFieldQkdInputSchema = z.object({
  stationMode: z.enum(["untrusted", "monitored"]),
  aliceLengthKm: z.number().min(0).max(10000),
  bobLengthKm: z.number().min(0).max(10000),
  fiberLossDbPerKm: z.number().min(0).max(10),
  aliceConnectorLossDb: z.number().min(0).max(100),
  bobConnectorLossDb: z.number().min(0).max(100),
  sourceRateHz: z.number().min(1),
  aliceMeanPhotonNumber: z.number().min(0).max(10),
  bobMeanPhotonNumber: z.number().min(0).max(10),
  middleStationDetectorEfficiency: z.number().min(0).max(1),
  darkCountProbability: z.number().min(0).max(1),
  backgroundCountProbability: z.number().min(0).max(1),
  interferenceVisibility: z.number().min(0).max(1),
  phaseTrackingEfficiency: z.number().min(0).max(1),
  phaseErrorSigmaRad: z.number().min(0).max(10),
  phasePostSelectionFraction: z.number().min(0).max(1),
  basisSiftingFactor: z.number().min(0).max(1),
  reconciliationEfficiency: z.number().min(1).max(5),
  blockSize: z.number().int().min(1)
});

export const cvQkdInputSchema = z.object({
  detectionMode: z.enum(["homodyne", "heterodyne"]),
  receiverTrustMode: z.enum(["trusted_receiver", "untrusted_receiver"]),
  distanceKm: z.number().min(0).max(10000),
  fiberLossDbPerKm: z.number().min(0).max(10),
  excessLossDb: z.number().min(0).max(100),
  sourceRateHz: z.number().min(1),
  modulationVarianceSnu: z.number().min(0.01).max(100),
  reconciliationEfficiency: z.number().min(0).max(1),
  excessNoiseSnu: z.number().min(0).max(100),
  preparationNoiseSnu: z.number().min(0).max(100),
  detectorEfficiency: z.number().min(0).max(1),
  electronicNoiseSnu: z.number().min(0).max(100),
  phaseRecoveryEfficiency: z.number().min(0).max(1),
  symbolUseFactor: z.number().min(0).max(1)
});

export const entanglementQkdInputSchema = z.object({
  protocol: z.enum(["bbm92", "e91"]),
  aliceLengthKm: z.number().min(0).max(10000),
  bobLengthKm: z.number().min(0).max(10000),
  fiberLossDbPerKm: z.number().min(0).max(10),
  aliceInsertionLossDb: z.number().min(0).max(100),
  bobInsertionLossDb: z.number().min(0).max(100),
  pairGenerationRateHz: z.number().min(1),
  pairEmissionProbability: z.number().min(0).max(1),
  sourceVisibility: z.number().min(0).max(1),
  sourceBellStateFidelity: z.number().min(0).max(1),
  detectorEfficiencyAlice: z.number().min(0).max(1),
  detectorEfficiencyBob: z.number().min(0).max(1),
  darkCountProbabilityAlice: z.number().min(0).max(1),
  darkCountProbabilityBob: z.number().min(0).max(1),
  backgroundCountProbabilityAlice: z.number().min(0).max(1),
  backgroundCountProbabilityBob: z.number().min(0).max(1),
  coincidenceWindowNs: z.number().min(0).max(1_000_000_000),
  misalignmentError: z.number().min(0).max(0.5),
  basisSiftingFactor: z.number().min(0).max(1),
  bellTestFraction: z.number().min(0).max(0.5),
  reconciliationEfficiency: z.number().min(1).max(5),
  blockSize: z.number().int().min(1)
});

export const qberForensicsInputSchema = z.object({
  measuredQber: z.number().min(0).max(0.5),
  misalignmentError: z.number().min(0).max(0.5),
  visibility: z.number().min(0).max(1),
  darkCountProbability: z.number().min(0).max(1),
  backgroundCountProbability: z.number().min(0).max(1),
  detectorMismatch: z.number().min(0).max(1),
  eveInterceptFraction: z.number().min(0).max(1),
  signalDetectionProbability: z.number().min(0).max(1)
});

export const postProcessingInputSchema = z.object({
  rawDetections: z.number().int().min(0),
  basisSiftingFactor: z.number().min(0).max(1),
  qber: z.number().min(0).max(0.5),
  sampleFraction: z.number().min(0).max(1),
  reconciliationEfficiency: z.number().min(1).max(5),
  verificationBits: z.number().int().min(0),
  authenticationBits: z.number().int().min(0),
  securityMarginBits: z.number().int().min(0)
});

export const attackInputSchema = z.object({
  attackType: z.enum([
    "intercept_resend",
    "pns_risk",
    "detector_mismatch",
    "trojan_horse_risk",
    "dos_background"
  ]),
  parameters: z.record(z.union([z.number(), z.boolean(), z.string()]))
});

export const kmsServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  priority: z.number().int().min(0),
  requestRatePerSecond: z.number().min(0),
  bitsPerRequest: z.number().int().min(1)
});

export const kmsSimulationInputSchema = z.object({
  durationSeconds: z.number().min(1),
  timeStepSeconds: z.number().min(0.001),
  initialBufferBits: z.number().min(0),
  bufferCapacityBits: z.number().min(1),
  generationRateBitsPerSecond: z.number().min(0),
  keyTtlSeconds: z.number().min(1),
  services: z.array(kmsServiceSchema).min(1)
});

export const quantumNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["endpoint", "trusted_node", "repeater", "satellite", "ground_station", "memory_node"]),
  memoryLifetimeMs: z.number().min(0).optional(),
  memoryCount: z.number().int().min(0).optional(),
  x: z.number().optional(),
  y: z.number().optional()
});

export const quantumLinkSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  lengthKm: z.number().min(0),
  attenuationDbPerKm: z.number().min(0).optional(),
  lossDb: z.number().min(0).optional(),
  successProbability: z.number().min(0).max(1).optional(),
  fidelity: z.number().min(0).max(1).optional(),
  classicalLatencyMs: z.number().min(0).optional()
});

export const quantumNetworkScenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  nodes: z.array(quantumNodeSchema).min(1),
  links: z.array(quantumLinkSchema),
  metadata: z.record(z.unknown()).optional()
}).strict();

export const routeInputSchema = z.object({
  scenario: quantumNetworkScenarioSchema,
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  objective: z.enum(["rate", "fidelity", "latency", "balanced"])
});

export const repeaterOptimizeInputSchema = z.object({
  totalDistanceKm: z.number().min(0),
  attenuationDbPerKm: z.number().min(0),
  memoryLifetimeMs: z.number().min(0),
  attemptRateHz: z.number().min(1),
  targetFidelity: z.number().min(0).max(1),
  maxRepeaters: z.number().int().min(0).max(100)
});

export const keyRequestSchema = z.object({
  applicationId: z.string().min(1),
  keyLengthBits: z.number().int().min(1).max(1048576),
  numberOfKeys: z.number().int().min(1).max(100),
  priority: z.number().int().min(0).max(10)
});

export const keyDescriptorSchema = z.object({
  keyId: z.string(),
  keyLengthBits: z.number().int(),
  createdAt: z.string(),
  expiresAt: z.string(),
  keyMaterial: z.string(),
  demoOnly: z.literal(true)
});

export const keyPoolStatusSchema = z.object({
  poolId: z.string(),
  availableBits: z.number().int(),
  capacityBits: z.number().int(),
  refillRateBitsPerSecond: z.number(),
  oldestKeyAgeSeconds: z.number(),
  status: z.enum(["ready", "low", "exhausted"]),
  demoOnly: z.literal(true)
});

export const keyRequestResponseSchema = z.object({
  keys: z.array(keyDescriptorSchema),
  remainingPoolBits: z.number().int(),
  demoOnly: z.literal(true)
});

export const insufficientKeyMaterialSchema = z.object({
  error: z.literal("InsufficientKeyMaterial"),
  availableBits: z.number().int(),
  requestedBits: z.number().int()
});

export const reportExportInputSchema = z.object({
  toolId: z.string().min(1),
  title: z.string().min(1),
  input: z.record(z.unknown()),
  result: z.record(z.unknown()),
  assumptions: z.array(z.string()),
  warnings: z.array(modelWarningSchema),
  references: z.array(z.string()).optional(),
  formulas: z.array(z.string()).optional(),
  version: z.string().optional(),
  format: z.enum(["json", "markdown"])
});

export type LinkBudgetInputFromSchema = z.infer<typeof linkBudgetInputSchema>;

export function validationErrorResponse(error: z.ZodError) {
  return {
    error: "ValidationError" as const,
    message: error.issues[0]?.message ?? "Input validation failed.",
    issues: error.issues
  };
}
