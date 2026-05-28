# API spec

This document describes internal API endpoints for the MVP. The OpenAPI version is in `contracts/openapi.yaml`.

## General response shape

Successful simulation response:

```json
{
  "input": {},
  "result": {},
  "assumptions": [],
  "warnings": [],
  "version": "model-name.simplified.v1"
}
```

Validation error response:

```json
{
  "error": "ValidationError",
  "message": "Human-readable message",
  "issues": []
}
```

## Simulation endpoints

### `POST /api/simulations/qkd/link-budget`

Computes QKD link budget and approximate secret-key rate.

Input fields:

- `protocol`: string.
- `lengthKm`: number.
- `fiberLossDbPerKm`: number.
- `connectorLossDb`: number.
- `sourceRateHz`: number.
- `meanPhotonNumber`: number.
- `detectorEfficiency`: number in [0,1].
- `darkCountProbability`: number in [0,1].
- `backgroundCountProbability`: number in [0,1].
- `misalignmentError`: number in [0,0.5].
- `basisSiftingFactor`: number in [0,1].
- `reconciliationEfficiency`: number >= 1.
- `blockSize`: integer.

Output fields:

- `channelTransmittance`.
- `totalLossDb`.
- `signalDetectionProbability`.
- `noiseDetectionProbability`.
- `rawRateHz`.
- `siftedRateHz`.
- `qber`.
- `secretFraction`.
- `secretKeyRateHz`.

### `POST /api/simulations/qkd/qber-forensics`

Decomposes QBER into model contributions.

Input:

- `measuredQber`.
- `misalignmentError`.
- `visibility`.
- `darkCountProbability`.
- `backgroundCountProbability`.
- `detectorMismatch`.
- `eveInterceptFraction`.
- `signalDetectionProbability`.

Output:

- `contributions`: list of name/value/explanation.
- `modeledQber`.
- `residualQber`.
- `likelyCauses`.

### `POST /api/simulations/qkd/post-processing`

Estimates post-processing stages.

Input:

- `rawDetections`.
- `basisSiftingFactor`.
- `qber`.
- `sampleFraction`.
- `reconciliationEfficiency`.
- `verificationBits`.
- `authenticationBits`.
- `securityMarginBits`.

Output:

- `siftedBits`.
- `parameterEstimationBits`.
- `remainingSiftedBits`.
- `reconciliationLeakageBits`.
- `verificationCostBits`.
- `authenticationCostBits`.
- `privacyAmplificationBits`.
- `finalKeyBits`.

### `POST /api/simulations/qkd/attack`

Runs one educational attack model.

Input:

- `attackType`: one of `intercept_resend`, `pns_risk`, `detector_mismatch`, `trojan_horse_risk`, `dos_background`.
- `parameters`: object.

Output:

- `metrics`: object.
- `riskLevel`: low/medium/high.
- `explanation`.
- `countermeasureConcepts`.

### `POST /api/simulations/kms/run`

Runs key-management simulator.

Input:

- `durationSeconds`.
- `timeStepSeconds`.
- `initialBufferBits`.
- `bufferCapacityBits`.
- `generationRateBitsPerSecond`.
- `keyTtlSeconds`.
- `services`: list of service definitions.

Service fields:

- `id`.
- `priority`.
- `requestRatePerSecond`.
- `bitsPerRequest`.

Output:

- `timeline`.
- `summaryByService`.
- `exhaustionEvents`.
- `finalBufferBits`.

### `POST /api/simulations/network/route`

Ranks routes in a quantum-network scenario.

Input:

- `scenario`: object matching `quantum-network-scenario.schema.json`.
- `sourceNodeId`.
- `targetNodeId`.
- `objective`: `rate`, `fidelity`, `latency`, or `balanced`.

Output:

- `routes`: ranked list.
- `warnings`.

### `POST /api/simulations/network/repeater-optimize`

Optimizes a simplified repeater chain.

Input:

- `totalDistanceKm`.
- `attenuationDbPerKm`.
- `memoryLifetimeMs`.
- `attemptRateHz`.
- `targetFidelity`.
- `maxRepeaters`.

Output:

- `candidates`.
- `bestCandidate`.
- `warnings`.

## Mock QKD key API endpoints

These endpoints simulate ETSI-style key-delivery behavior. They are demo-only and do not produce production cryptographic material.

### `GET /api/qkd-mock/status`

Returns key pool status.

Output:

- `poolId`.
- `availableBits`.
- `capacityBits`.
- `refillRateBitsPerSecond`.
- `oldestKeyAgeSeconds`.
- `status`.

### `POST /api/qkd-mock/keys/request`

Requests one or more mock keys.

Input:

- `applicationId`.
- `keyLengthBits`.
- `numberOfKeys`.
- `priority`.

Output if successful:

- `keys`: list of key descriptors.
- `remainingPoolBits`.

Key descriptor:

- `keyId`.
- `keyLengthBits`.
- `createdAt`.
- `expiresAt`.
- `keyMaterial`: demo-only string.

Output if exhausted:

- `error`: `InsufficientKeyMaterial`.
- `availableBits`.
- `requestedBits`.

### `GET /api/qkd-mock/keys/[keyId]`

Retrieves one key descriptor by ID. For MVP this can return the same demo material shown at request time, but mark it demo-only.

## Export endpoints

### `POST /api/export/report`

Input:

- `toolId`.
- `title`.
- `input`.
- `result`.
- `assumptions`.
- `warnings`.
- `format`: `json` or `markdown`.

Output:

- `content`.
- `filename`.
- `mimeType`.
