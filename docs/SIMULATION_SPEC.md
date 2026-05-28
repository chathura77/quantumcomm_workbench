# Simulation spec

This MVP uses simplified, transparent models. The goal is exploratory insight, not certified security analysis.

## Shared helpers

### dB conversion

```ts
linear = 10 ** (-lossDb / 10)
lossDb = -10 * log10(linear)
```

### Binary entropy

For q in [0,1]:

```ts
h2(q) = -q * log2(q) - (1 - q) * log2(1 - q)
```

Define h2(0) = 0 and h2(1) = 0 for numerical stability. Warn when q > 0.5 for QKD secret-key formulas.

## QKD link budget model

Inputs:

- lengthKm: L
- fiberLossDbPerKm: alpha
- connectorLossDb: L_conn
- sourceRateHz: R_src
- meanPhotonNumber: mu
- detectorEfficiency: eta_det
- darkCountProbability: p_dark
- backgroundCountProbability: p_bg
- misalignmentError: e_det
- basisSiftingFactor: q_basis
- reconciliationEfficiency: f_ec

Calculations:

```text
totalLossDb = alpha * L + L_conn
eta_channel = 10^(-totalLossDb / 10)
eta_total = eta_channel * eta_det
p_signal = 1 - exp(-mu * eta_total)
p_noise = p_dark + p_bg
p_click = min(1, p_signal + p_noise)
rawRateHz = R_src * p_click
siftedRateHz = rawRateHz * q_basis
qber = (e_det * p_signal + 0.5 * p_noise) / max(p_click, epsilon)
secretFraction = max(0, 1 - f_ec * h2(qber) - h2(qber))
secretKeyRateHz = siftedRateHz * secretFraction
```

Warnings:

- If QBER >= 0.11, warn that ideal BB84 asymptotic key rate is typically zero or marginal under common assumptions.
- If p_click > 0.2, warn about detector saturation/dead-time not modeled.
- If lengthKm is very high and secretKeyRateHz is nonzero only due to noise, warn about model limitations.

Distance sweep:

- Compute the above for 0..maxDistanceKm in fixed steps.
- Return an array of distance, loss, qber, secretKeyRateHz.

## Decoy-state simplified model

MVP may expose decoy-state BB84 but should label it as simplified.

Use the same core link-budget result and provide an optional lower-bound proxy:

```text
Q_mu = p_click
E_mu = qber
Y_1_proxy = eta_total + p_noise
e_1_proxy = (e_det * eta_total + 0.5 * p_noise) / max(Y_1_proxy, epsilon)
Q_1_proxy = mu * exp(-mu) * Y_1_proxy
R_proxy = q_basis * max(0, -Q_mu * f_ec * h2(E_mu) + Q_1_proxy * (1 - h2(e_1_proxy)))
secretKeyRateHz = R_src * R_proxy
```

Warn that this is a pedagogical proxy, not a full decoy-state finite-key proof.

## QBER forensics model

Contribution proxies:

```text
misalignment = misalignmentError
visibility = max(0, (1 - visibility) / 2)
noise = 0.5 * (darkCountProbability + backgroundCountProbability) / max(signalDetectionProbability + dark + background, epsilon)
detectorMismatch = 0.5 * detectorMismatch
interceptResend = 0.25 * eveInterceptFraction
```

Modeled QBER is clamped to [0, 0.5]. Residual QBER:

```text
residual = measuredQber - modeledQber
```

Likely cause rules:

- High misalignment: "polarization or phase calibration drift".
- High noise: "dark counts, background light, filtering, timing gate width".
- High visibility contribution: "interferometer visibility or mode mismatch".
- Positive residual: "unmodeled device imperfection, calibration drift, or adversarial disturbance".

## Post-processing model

Inputs:

- rawDetections N_raw
- basisSiftingFactor q_basis
- qber Q
- sampleFraction s
- reconciliationEfficiency f_ec
- verificationBits v
- authenticationBits a
- securityMarginBits m

Calculations:

```text
siftedBits = floor(N_raw * q_basis)
parameterEstimationBits = floor(siftedBits * s)
remainingSiftedBits = siftedBits - parameterEstimationBits
reconciliationLeakageBits = ceil(f_ec * remainingSiftedBits * h2(Q))
phaseErrorCostBits = ceil(remainingSiftedBits * h2(Q))
finalKeyBits = max(0, remainingSiftedBits - reconciliationLeakageBits - phaseErrorCostBits - v - a - m)
```

Show a stage table with before/after counts.

## Attack explorer models

All attack explorer models are simulation-only and should not include device exploit instructions.

### Intercept-resend

```text
qberAdded = 0.25 * eveInterceptFraction
informationLeakProxy = 0.5 * eveInterceptFraction
abortProbabilityProxy = 1 - exp(-sampleSize * max(0, qberAdded - detectionThreshold)^2)
```

### Photon-number splitting risk indicator

For weak coherent pulses with mean photon number mu:

```text
pMultiPhoton = 1 - exp(-mu) * (1 + mu)
riskProxy = pMultiPhoton * channelLossAdvantageFactor
```

Use decoy-state enabled/disabled as a strong mitigation flag.

### Detector mismatch

```text
biasProxy = abs(eta0 - eta1) / max(eta0 + eta1, epsilon)
qberProxy = 0.5 * timingShiftFraction * biasProxy
```

### Trojan-horse leakage risk

```text
returnedPhotonProxy = probePhotons * backReflection * 10^(-isolationDb / 10)
riskLevel = thresholds over returnedPhotonProxy and monitoringProbability
```

Do not provide operational optical power/timing instructions. Use generic educational labels.

### Background-light denial of service

```text
noiseProbability = backgroundCountProbability + darkCountProbability
qberNoise = 0.5 * noiseProbability / max(signalDetectionProbability + noiseProbability, epsilon)
rateCollapse = max(0, 1 - secretKeyRateWithNoise / max(secretKeyRateNoNoise, epsilon))
```

## KMS simulator

Discrete time simulation.

At each time step:

1. Add `generationRateBitsPerSecond * dt` to buffer up to capacity.
2. Sort service requests by priority.
3. For each service, compute expected requests this step: `requestRatePerSecond * dt`.
4. Convert fractional requests deterministically for MVP or use seeded pseudo-random sampling if implemented.
5. Grant requests while enough buffer exists.
6. Deny requests when buffer is insufficient.
7. Track generated, consumed, denied, and buffer level.

Optional deterministic fractional approach:

```text
requestedBits = requestRatePerSecond * dt * bitsPerRequest
if buffer >= requestedBits: consume requestedBits
else: deny ceil((requestedBits - buffer) / bitsPerRequest), consume available allowed part only if policy permits partial false
```

Prefer no partial grants for key requests.

## Phase-encoding calculator

Constants:

```text
c = 299792458 m/s
n_eff = 1.4682 default for silica fiber
```

Path length difference from time-bin separation:

```text
deltaLengthMeters = c * deltaTimeSeconds / n_eff
```

Phase shift from length change:

```text
phaseRadians = 2 * pi * n_eff * deltaLengthMeters / wavelengthMeters
```

Coherence length:

```text
coherenceLengthMeters = c / (pi * linewidthHz * n_eff)
```

Warn when path difference is larger than coherence length for phase-sensitive interference.

Thermal drift proxy:

```text
opticalPathDriftMeters = physicalLengthMeters * thermoOpticCoefficient * deltaTemperatureC
phaseDriftRadians = 2 * pi * opticalPathDriftMeters / wavelengthMeters
```

## Channel planner

Fiber:

```text
totalLossDb = fiberLossDbPerKm * lengthKm + connectorLossDb + spliceLossDb + componentLossDb
```

Free-space:

Use user-provided geometric loss, pointing loss, atmospheric loss, receiver optical loss, filter loss, detector efficiency. The MVP does not need a full diffraction model.

Satellite-style:

Use pass duration, average loss, background probability, pointing loss, and duty cycle. Label as coarse.

## Entanglement routing

For a path of links:

```text
pathSuccessProbability = product(link.successProbability)
pathFidelityProxy = combine adjacent fidelities with Werner swap proxy
pathLatencyMs = sum(link.classicalLatencyMs)
rateProxy = attemptRateHz * pathSuccessProbability
```

Werner swap proxy for two fidelities F1 and F2:

```text
F_swap = F1 * F2 + ((1 - F1) * (1 - F2)) / 3
```

Memory warning:

- If pathLatencyMs > minNodeMemoryLifetimeMs, warn that memory lifetime may be insufficient.

Route score:

```text
balancedScore = log(rateProxy + epsilon) + 2 * pathFidelityProxy - 0.01 * pathLatencyMs
```

## Repeater optimizer

For repeaters r from 0 to maxRepeaters:

```text
segments = r + 1
segmentLengthKm = totalDistanceKm / segments
segmentLossDb = attenuationDbPerKm * segmentLengthKm
segmentTransmittance = 10^(-segmentLossDb / 10)
linkSuccess = segmentTransmittance * detectorEfficiencyProxy
chainSuccessProxy = linkSuccess ^ segments
swapPenalty = swapSuccessProbability ^ r
rateProxy = attemptRateHz * chainSuccessProxy * swapPenalty
fidelityProxy = initialLinkFidelity ^ segments * swapFidelityPenalty ^ r
```

Select best candidate that satisfies target fidelity, otherwise best balanced score.

## Paper-to-parameter extractor

Use rule-based regex plus confidence flags.

Extract examples:

- Distance: `100 km`, `100-km`, `over 100 km`.
- Loss: `20 dB`, `0.2 dB/km`.
- QBER: `QBER of 1.8%`, `error rate 0.018`.
- Key rate: `1.2 kbps`, `10 Mbit/s`, `secret key rate`.
- Wavelength: `1550 nm`, `850 nm`.
- Detector efficiency: `efficiency of 20%`.
- Dark count: `100 cps`, `dark count rate`.
- Repetition rate: `1 GHz`, `100 MHz`.

Return extracted value, unit, text span, and confidence.
