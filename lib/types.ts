export type WarningSeverity = "info" | "warning" | "critical";

export type ModelWarning = {
  code: string;
  message: string;
  severity: WarningSeverity;
};

export type SavedWorkbenchRun = {
  id: string;
  toolId: string;
  title: string;
  createdAt: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  assumptions: string[];
  warnings: ModelWarning[];
  formulas: string[];
  references: string[];
  version: string;
};

export type SimulationResponse<TInput, TResult> = {
  input: TInput;
  result: TResult;
  assumptions: string[];
  warnings: ModelWarning[];
  version: string;
};

export type QkdProtocol =
  | "bb84"
  | "decoy_bb84"
  | "e91"
  | "bbm92"
  | "mdi_qkd"
  | "tf_qkd"
  | "cv_qkd";

export type LinkBudgetInput = {
  protocol: QkdProtocol;
  lengthKm: number;
  fiberLossDbPerKm: number;
  connectorLossDb: number;
  sourceRateHz: number;
  meanPhotonNumber: number;
  detectorEfficiency: number;
  darkCountProbability: number;
  backgroundCountProbability: number;
  misalignmentError: number;
  basisSiftingFactor: number;
  senderZBasisProbability: number;
  receiverZBasisProbability: number;
  detectorDeadTimeNs: number;
  afterpulseProbability: number;
  reconciliationEfficiency: number;
  blockSize: number;
};

export type DecoyLowerBoundEstimate = {
  signalGain: number;
  singlePhotonEmissionProbability: number;
  multiPhotonEmissionProbability: number;
  vacuumYieldProxy: number;
  singlePhotonYieldLowerBound: number;
  singlePhotonErrorUpperBound: number;
  singlePhotonGainLowerBound: number;
  singlePhotonContributionFraction: number;
  lowerBoundSecretFraction: number;
  lowerBoundSecretKeyRateHz: number;
};

export type LinkBudgetResult = {
  totalLossDb: number;
  channelTransmittance: number;
  totalDetectionEfficiency: number;
  baseSignalDetectionProbability: number;
  baseNoiseDetectionProbability: number;
  afterpulseNoiseProbability: number;
  deadTimeAvailabilityFactor: number;
  signalDetectionProbability: number;
  noiseDetectionProbability: number;
  clickProbability: number;
  rawRateHz: number;
  basisAgreementProbability: number;
  effectiveSiftingFactor: number;
  siftedRateHz: number;
  qber: number;
  binaryEntropyQber: number;
  secretFraction: number;
  secretKeyRateHz: number;
  decoyLowerBound?: DecoyLowerBoundEstimate;
};

export type FiniteKeyBb84Input = LinkBudgetInput & {
  sampleFraction: number;
  epsilonCorrectness: number;
  epsilonSecrecy: number;
  epsilonParameterEstimation: number;
};

export type FiniteKeyBb84Result = {
  emittedSignals: number;
  rawDetections: number;
  siftedBits: number;
  parameterEstimationBits: number;
  keyGenerationBits: number;
  basisAgreementProbability: number;
  effectiveSiftingFactor: number;
  observedQber: number;
  afterpulseNoiseProbability: number;
  deadTimeAvailabilityFactor: number;
  parameterEstimationPenalty: number;
  secrecyQberPenalty: number;
  qberUpperBound: number;
  statisticalPenalty: number;
  reconciliationLeakageBits: number;
  privacyAmplificationBits: number;
  correctnessPenaltyBits: number;
  secrecyPenaltyBits: number;
  finalKeyBits: number;
  secretFractionPerPulse: number;
  secretKeyRateHz: number;
  decoyLowerBound?: DecoyLowerBoundEstimate;
  sensitivitySweeps: FiniteKeySensitivitySweep[];
  distanceUncertaintyBand: FiniteKeyUncertaintyBandPoint[];
};

export type FiniteKeySweepAxis = "distanceKm" | "addedLossDb" | "observedQber" | "detectorEfficiency" | "blockSize";

export type FiniteKeySensitivitySweepPoint = {
  value: number;
  observedQber: number;
  qberUpperBound: number;
  finalKeyBits: number;
  secretKeyRateHz: number;
};

export type FiniteKeySensitivitySweep = {
  axis: FiniteKeySweepAxis;
  label: string;
  unit?: string;
  points: FiniteKeySensitivitySweepPoint[];
};

export type FiniteKeyUncertaintyBandPoint = {
  distanceKm: number;
  optimisticKeyRateHz: number;
  baselineKeyRateHz: number;
  conservativeKeyRateHz: number;
  optimisticFinalKeyBits: number;
  baselineFinalKeyBits: number;
  conservativeFinalKeyBits: number;
};

export type MdiQkdRelayMode = "untrusted" | "monitored";

export type MdiQkdInput = {
  relayMode: MdiQkdRelayMode;
  aliceLengthKm: number;
  bobLengthKm: number;
  fiberLossDbPerKm: number;
  aliceConnectorLossDb: number;
  bobConnectorLossDb: number;
  sourceRateHz: number;
  aliceMeanPhotonNumber: number;
  bobMeanPhotonNumber: number;
  relayDetectorEfficiency: number;
  relayDarkCountProbability: number;
  backgroundCountProbability: number;
  interferenceVisibility: number;
  misalignmentError: number;
  bellStateMeasurementEfficiency: number;
  basisSiftingFactor: number;
  reconciliationEfficiency: number;
  blockSize: number;
};

export type MdiQkdDistanceSweepPoint = {
  totalDistanceKm: number;
  coincidenceProbability: number;
  qber: number;
  secretKeyRateHz: number;
  symmetryRatio: number;
};

export type MdiQkdResult = {
  aliceTotalLossDb: number;
  bobTotalLossDb: number;
  totalDistanceKm: number;
  aliceChannelTransmittance: number;
  bobChannelTransmittance: number;
  aliceRelayDetectionProbability: number;
  bobRelayDetectionProbability: number;
  symmetryRatio: number;
  interferencePenalty: number;
  jointSignalProbability: number;
  relayNoiseProbability: number;
  coincidenceProbability: number;
  relayAnnouncementRateHz: number;
  siftedRateHz: number;
  qber: number;
  secretFraction: number;
  secretKeyRateHz: number;
  announcedBellEvents: number;
  siftedBitsPerBlock: number;
  distanceSweep: MdiQkdDistanceSweepPoint[];
};

export type TwinFieldQkdStationMode = "untrusted" | "monitored";

export type TwinFieldQkdInput = {
  stationMode: TwinFieldQkdStationMode;
  aliceLengthKm: number;
  bobLengthKm: number;
  fiberLossDbPerKm: number;
  aliceConnectorLossDb: number;
  bobConnectorLossDb: number;
  sourceRateHz: number;
  aliceMeanPhotonNumber: number;
  bobMeanPhotonNumber: number;
  middleStationDetectorEfficiency: number;
  darkCountProbability: number;
  backgroundCountProbability: number;
  interferenceVisibility: number;
  phaseTrackingEfficiency: number;
  phaseErrorSigmaRad: number;
  phasePostSelectionFraction: number;
  basisSiftingFactor: number;
  reconciliationEfficiency: number;
  blockSize: number;
};

export type TwinFieldQkdDistanceSweepPoint = {
  totalDistanceKm: number;
  qber: number;
  secretKeyRateHz: number;
  phaseStabilityFactor: number;
  interferencePenalty: number;
};

export type TwinFieldQkdResult = {
  aliceTotalLossDb: number;
  bobTotalLossDb: number;
  totalDistanceKm: number;
  aliceChannelTransmittance: number;
  bobChannelTransmittance: number;
  symmetryRatio: number;
  aliceArrivalProbability: number;
  bobArrivalProbability: number;
  phaseStabilityFactor: number;
  interferencePenalty: number;
  singlePhotonWeight: number;
  middleStationSignalProbability: number;
  middleStationNoiseProbability: number;
  clickProbability: number;
  qber: number;
  middleStationClickRateHz: number;
  siftedRateHz: number;
  secretFraction: number;
  secretKeyRateHz: number;
  acceptedWindowsPerBlock: number;
  siftedBitsPerBlock: number;
  distanceSweep: TwinFieldQkdDistanceSweepPoint[];
};

export type CvQkdDetectionMode = "homodyne" | "heterodyne";

export type CvQkdReceiverTrustMode = "trusted_receiver" | "untrusted_receiver";

export type CvQkdInput = {
  detectionMode: CvQkdDetectionMode;
  receiverTrustMode: CvQkdReceiverTrustMode;
  distanceKm: number;
  fiberLossDbPerKm: number;
  excessLossDb: number;
  sourceRateHz: number;
  modulationVarianceSnu: number;
  reconciliationEfficiency: number;
  excessNoiseSnu: number;
  preparationNoiseSnu: number;
  detectorEfficiency: number;
  electronicNoiseSnu: number;
  phaseRecoveryEfficiency: number;
  symbolUseFactor: number;
};

export type CvQkdDistanceSweepPoint = {
  distanceKm: number;
  snr: number;
  totalNoiseSnu: number;
  mutualInformationAB: number;
  holevoBoundProxy: number;
  secretKeyRateHz: number;
};

export type CvQkdResult = {
  totalLossDb: number;
  channelTransmittance: number;
  effectiveDetectionEfficiency: number;
  lineNoiseSnu: number;
  receiverAddedNoiseSnu: number;
  trustedNoiseSnu: number;
  untrustedNoiseSnu: number;
  totalNoiseSnu: number;
  receivedQuadratureVarianceSnu: number;
  covarianceProxy: number;
  correlationCoefficient: number;
  snr: number;
  mutualInformationAB: number;
  holevoBoundProxy: number;
  secretFractionPerUse: number;
  secretKeyRateHz: number;
  distanceSweep: CvQkdDistanceSweepPoint[];
};

export type EntanglementProtocol = "bbm92" | "e91";

export type EntanglementQkdInput = {
  protocol: EntanglementProtocol;
  aliceLengthKm: number;
  bobLengthKm: number;
  fiberLossDbPerKm: number;
  aliceInsertionLossDb: number;
  bobInsertionLossDb: number;
  pairGenerationRateHz: number;
  pairEmissionProbability: number;
  sourceVisibility: number;
  sourceBellStateFidelity: number;
  detectorEfficiencyAlice: number;
  detectorEfficiencyBob: number;
  darkCountProbabilityAlice: number;
  darkCountProbabilityBob: number;
  backgroundCountProbabilityAlice: number;
  backgroundCountProbabilityBob: number;
  coincidenceWindowNs: number;
  misalignmentError: number;
  basisSiftingFactor: number;
  bellTestFraction: number;
  reconciliationEfficiency: number;
  blockSize: number;
};

export type EntanglementQkdDistanceSweepPoint = {
  totalDistanceKm: number;
  coincidenceProbability: number;
  qber: number;
  chshScore: number;
  secretKeyRateHz: number;
};

export type EntanglementQkdResult = {
  aliceTotalLossDb: number;
  bobTotalLossDb: number;
  totalDistanceKm: number;
  aliceArmTransmittance: number;
  bobArmTransmittance: number;
  pairCollectionProbability: number;
  accidentalCoincidenceProbability: number;
  coincidenceProbability: number;
  effectiveVisibility: number;
  qber: number;
  chshScore: number;
  bellViolationMargin: number;
  rawCoincidenceRateHz: number;
  siftedRateHz: number;
  keyGenerationFraction: number;
  estimatedPairsPerBlock: number;
  keyGenerationPairsPerBlock: number;
  secretFraction: number;
  secretKeyRateHz: number;
  distanceSweep: EntanglementQkdDistanceSweepPoint[];
};

export type QberContribution = {
  id: string;
  label: string;
  qberContribution: number;
  explanation: string;
};

export type QberForensicsInput = {
  measuredQber: number;
  misalignmentError: number;
  visibility: number;
  darkCountProbability: number;
  backgroundCountProbability: number;
  detectorMismatch: number;
  eveInterceptFraction: number;
  signalDetectionProbability: number;
};

export type QberForensicsResult = {
  measuredQber: number;
  modeledQber: number;
  residualQber: number;
  contributions: QberContribution[];
  likelyCauses: string[];
};

export type PostProcessingInput = {
  rawDetections: number;
  basisSiftingFactor: number;
  qber: number;
  sampleFraction: number;
  reconciliationEfficiency: number;
  verificationBits: number;
  authenticationBits: number;
  securityMarginBits: number;
};

export type PostProcessingResult = {
  siftedBits: number;
  parameterEstimationBits: number;
  remainingSiftedBits: number;
  reconciliationLeakageBits: number;
  phaseErrorCostBits: number;
  verificationCostBits: number;
  authenticationCostBits: number;
  securityMarginBits: number;
  finalKeyBits: number;
  finalKeyFractionOfRaw: number;
  stages: Array<{ stage: string; beforeBits: number; afterBits: number; note: string }>;
};

export type AttackType =
  | "intercept_resend"
  | "pns_risk"
  | "detector_mismatch"
  | "trojan_horse_risk"
  | "dos_background";

export type AttackInput = {
  attackType: AttackType;
  parameters: Record<string, number | boolean | string>;
};

export type AttackResult = {
  metrics: Record<string, number | string | boolean>;
  riskLevel: "low" | "medium" | "high";
  explanation: string;
  countermeasureConcepts: string[];
};

export type KmsService = {
  id: string;
  name: string;
  priority: number;
  requestRatePerSecond: number;
  bitsPerRequest: number;
};

export type KmsSimulationInput = {
  durationSeconds: number;
  timeStepSeconds: number;
  initialBufferBits: number;
  bufferCapacityBits: number;
  generationRateBitsPerSecond: number;
  keyTtlSeconds: number;
  services: KmsService[];
};

export type KmsTimelinePoint = {
  t: number;
  bufferBits: number;
  generatedBits: number;
  consumedBits: number;
  deniedRequests: number;
};

export type KmsSimulationResult = {
  timeline: KmsTimelinePoint[];
  finalBufferBits: number;
  totalGeneratedBits: number;
  totalConsumedBits: number;
  totalDeniedRequests: number;
  exhaustionEvents: number;
  exhaustionProbability: number;
  summaryByService: Array<{
    serviceId: string;
    name: string;
    grantedRequests: number;
    deniedRequests: number;
    consumedBits: number;
  }>;
};

export type QuantumNodeType =
  | "endpoint"
  | "trusted_node"
  | "repeater"
  | "satellite"
  | "ground_station"
  | "memory_node";

export type QuantumNode = {
  id: string;
  label: string;
  type: QuantumNodeType;
  memoryLifetimeMs?: number;
  memoryCount?: number;
  x?: number;
  y?: number;
};

export type QuantumLink = {
  id: string;
  source: string;
  target: string;
  lengthKm: number;
  attenuationDbPerKm?: number;
  lossDb?: number;
  successProbability?: number;
  fidelity?: number;
  classicalLatencyMs?: number;
};

export type QuantumNetworkScenario = {
  id: string;
  name: string;
  description?: string;
  nodes: QuantumNode[];
  links: QuantumLink[];
  metadata?: Record<string, unknown>;
};

export type SavedScenarioRecord = {
  id: string;
  title: string;
  createdAt: string;
  scenario: QuantumNetworkScenario;
  warnings: ModelWarning[];
};

export type SavedScenarioBundle = {
  version: string;
  exportedAt: string;
  scenarios: SavedScenarioRecord[];
};
