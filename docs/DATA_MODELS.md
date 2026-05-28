# Data models

Use these as TypeScript model guidance. Exact names can be adapted, but keep the concepts stable.

## Common

```ts
export type ModelWarning = {
  code: string;
  message: string;
  severity: "info" | "warning" | "critical";
};

export type SimulationResponse<TInput, TResult> = {
  input: TInput;
  result: TResult;
  assumptions: string[];
  warnings: ModelWarning[];
  version: string;
};
```

## QKD link budget

```ts
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
  reconciliationEfficiency: number;
  blockSize: number;
};

export type LinkBudgetResult = {
  totalLossDb: number;
  channelTransmittance: number;
  totalDetectionEfficiency: number;
  signalDetectionProbability: number;
  noiseDetectionProbability: number;
  clickProbability: number;
  rawRateHz: number;
  siftedRateHz: number;
  qber: number;
  binaryEntropyQber: number;
  secretFraction: number;
  secretKeyRateHz: number;
};
```

## QBER forensics

```ts
export type QberContribution = {
  id: string;
  label: string;
  qberContribution: number;
  explanation: string;
};

export type QberForensicsResult = {
  measuredQber: number;
  modeledQber: number;
  residualQber: number;
  contributions: QberContribution[];
  likelyCauses: string[];
};
```

## Post-processing

```ts
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
};
```

## KMS

```ts
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
};
```

## Quantum network scenario

```ts
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
```

## Report export

```ts
export type ReproducibleRunReport = {
  runId: string;
  toolId: string;
  title: string;
  createdAt: string;
  modelVersion: string;
  input: unknown;
  result: unknown;
  assumptions: string[];
  warnings: ModelWarning[];
  references: string[];
};
```
