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

Use the same core link-budget result and provide an explicit lower-bound teaching proxy:

```text
Q_mu = p_click
E_mu = qber
P_1 = mu * exp(-mu)
P_multi = 1 - exp(-mu) * (1 + mu)
Y_0_proxy = p_noise
Y_1_lower = eta_total + Y_0_proxy * (1 - eta_total)
e_1_upper = (e_det * eta_total + 0.5 * Y_0_proxy + p_after) / max(Y_1_lower, epsilon)
Q_1_lower = P_1 * Y_1_lower
R_proxy = q_basis * max(0, -Q_mu * f_ec * h2(E_mu) + Q_1_lower * (1 - h2(e_1_upper)))
secretKeyRateHz = R_src * R_proxy
```

Expose the intermediate teaching outputs so the UI and exports can show:

- singlePhotonEmissionProbability = `P_1`
- multiPhotonEmissionProbability = `P_multi`
- singlePhotonYieldLowerBound = `Y_1_lower`
- singlePhotonErrorUpperBound = `e_1_upper`
- singlePhotonGainLowerBound = `Q_1_lower`

Warn that this is a pedagogical lower-bound proxy, not a full decoy-state finite-key proof or optimization routine.

## Finite-key BB84 teaching model

The finite-key BB84 teaching estimator reuses the simplified link-budget result, then adds explicit finite-size bookkeeping terms.

Inputs in addition to the link-budget fields:

- sampleFraction
- epsilonCorrectness
- epsilonSecrecy
- epsilonParameterEstimation

Additional hardware-proxy controls now supported through the shared link-budget kernel:

- detectorDeadTimeNs
- afterpulseProbability
- senderZBasisProbability
- receiverZBasisProbability

Core teaching calculations:

```text
p_after = afterpulseProbability * (p_signal,base + p_noise,base)
availability_dead = 1 / (1 + sourceRateHz * p_click,pre * detectorDeadTimeNs * 1e-9)
basisAgreement = pZ_A pZ_B + (1 - pZ_A)(1 - pZ_B)
q_basis,eff = q_basis * basisAgreement / 0.5
n_emit = floor(blockSize)
n_raw = floor(n_emit * p_click)
n_sift = floor(n_raw * q_basis,eff)
n_pe = ceil(n_sift * sampleFraction)
n_key = max(0, n_sift - n_pe)
delta_pe = sqrt(ln(2 / epsilon_pe) / (2 n_pe))
delta_sec = sqrt(ln(2 / epsilon_sec) / (2 n_key))
Q_upper = min(0.5, Q_obs + delta_pe + delta_sec)
l = max(0, n_key - leak_EC - n_key * h2(Q_upper) - log2(2 / epsilon_correct) - 2 log2(1 / epsilon_sec))
```

Teaching sensitivity sweeps:

- Distance sweep varies `lengthKm`.
- Added-loss sweep varies additional component loss relative to the current baseline.
- Observed-QBER sweep varies misalignment input and reports the resulting observed QBER on the x-axis.
- Detector-efficiency sweep varies `detectorEfficiency`.
- Block-size sweep varies `blockSize` logarithmically.

Interpret the new hardware terms as teaching proxies only:

- `detectorDeadTimeNs` uses a non-paralyzable detector-availability approximation.
- `afterpulseProbability` adds click-correlated noise before the dead-time availability factor is applied.
- Basis bias changes the effective sifted fraction through sender and receiver Z-basis probabilities; it is not a full biased-basis finite-key proof.

Teaching uncertainty band:

- Over the distance sweep, report three variants:
- Optimistic: privacy amplification uses `Q_obs`.
- Baseline: privacy amplification uses `Q_obs + delta_pe`.
- Conservative: privacy amplification uses `Q_obs + delta_pe + delta_sec`.

Label this as a statistical teaching band, not a confidence interval or deployment calibration envelope.

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

## MDI-QKD relay estimator

The MDI-QKD teaching estimator uses two independent loss arms that meet at a middle Bell-state-measurement relay.

Inputs:

- Alice arm length `L_A`
- Bob arm length `L_B`
- shared fiber attenuation `alpha`
- Alice and Bob connector/component losses `L_conn,A`, `L_conn,B`
- relay detector efficiency `eta_det,relay`
- mean photon numbers `mu_A`, `mu_B`
- Bell-state-measurement efficiency `eta_BSM`
- interference visibility `V`
- relay dark/background probabilities
- misalignment error `e_det`
- basis sifting factor `q_basis`
- reconciliation efficiency `f_ec`

Teaching calculations:

```text
loss_A = alpha * L_A + L_conn,A
loss_B = alpha * L_B + L_conn,B
eta_A = 10^(-loss_A / 10)
eta_B = 10^(-loss_B / 10)
p_A = 1 - exp(-mu_A * eta_A * eta_det,relay)
p_B = 1 - exp(-mu_B * eta_B * eta_det,relay)
symmetry = min(eta_A, eta_B) / max(eta_A, eta_B)
interferencePenalty = V * sqrt(symmetry)
p_joint = p_A * p_B * eta_BSM * interferencePenalty
p_noise = 2 * (p_dark,relay + p_bg)
Q = (p_joint * ((1 - V) / 2 + e_det) + 0.5 * p_noise) / max(p_joint + p_noise, epsilon)
R_secret = R_src * q_basis * (p_joint + p_noise) * max(0, 1 - f_ec h2(Q) - h2(Q))
```

Warnings:

- Low symmetry means the two relay arms are imbalanced.
- Low visibility warns that interference alignment dominates the estimate.
- QBER above common BB84-style teaching thresholds is flagged as marginal or zero-key territory.

Label the result as a non-certified teaching proxy rather than a full MDI-QKD finite-key or decoy-state proof.

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
