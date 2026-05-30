# Routes and pages

## Global layout

Top navigation:

- Learn
- Tools
- Networks
- Resources
- API Sandbox

Footer:

- Disclaimer
- References
- Source repository
- Model limitations

## `/`

Purpose: landing page for QuantumComm Workbench.

Required sections:

- Hero: "Quantum communication tools from photon link to network scenario."
- Four cards: Learn, Tools, Networks, Resources.
- Flagship workflow: QKD Engineering Lab -> API/KMS Sandbox -> Network Scenario Builder.
- Disclaimer banner.

## `/learn`

Protocol directory.

Cards:

- BB84
- E91
- BBM92
- Decoy-state BB84
- MDI-QKD
- TF-QKD
- CV-QKD
- Teleportation
- Entanglement swapping
- Quantum repeaters

Each card links to `/learn/[protocol]`.

## `/learn/[protocol]`

Page sections:

- Overview.
- Core idea.
- Minimal mathematics.
- Typical assumptions.
- Common failure modes.
- Related tools.
- References.

For BB84 and E91 include interactive mini-demos:

- BB84: Alice bits/bases, Bob bases, Eve fraction, sifted key, QBER.
- E91: CHSH-style correlation demo with simplified correlation settings.

## `/tools`

Tool directory grouped by category:

- QKD engineering.
- Standards and integration.
- Optical/channel design.
- Research utilities.

## `/tools/qkd-engineering-lab`

Integrated workflow that combines link budget, QBER, post-processing, and selected attack scenarios.

Inputs:

- Protocol preset.
- Channel length and loss.
- Source mean photon number or repetition rate.
- Detector efficiency, dark count, dead time.
- Misalignment error.
- Basis sifting factor.
- Reconciliation efficiency.
- Finite-key block size.
- Optional attack model.

Outputs:

- Detection probability.
- Raw click rate.
- Sifted rate.
- QBER.
- Reconciliation leakage.
- Privacy-amplified key length.
- Secret-key rate.
- Warnings.

## `/tools/link-budget`

Focused calculator with distance sweep chart.

Required presets:

- Campus fiber, 2 km.
- Metro fiber, 25 km.
- Long fiber, 100 km.
- Free-space demo, 1 km.

## `/tools/finite-key-bb84`

Finite-key BB84 teaching estimator with explicit security parameters.

Outputs:

- Correctness, secrecy, and parameter-estimation epsilon controls.
- Finite-size penalty accounting in bits.
- Detector dead-time, afterpulsing, and basis-bias teaching proxies.
- Sensitivity sweeps for distance, loss, QBER, detector efficiency, and block size.
- Uncertainty-band chart with clear non-certified-model language.

## `/tools/qber-forensics`

Dashboard that decomposes QBER.

Inputs:

- Measured QBER.
- Misalignment.
- Dark count probability.
- Background count probability.
- Visibility.
- Detector efficiency mismatch.
- Eve/intercept fraction.

Outputs:

- Contribution table.
- Residual unexplained error.
- Likely causes.
- Sensitivity plot.

## `/tools/post-processing`

Pipeline visualizer.

Stages:

1. Raw detections.
2. Basis sifting.
3. Parameter estimation.
4. Information reconciliation.
5. Error verification.
6. Authentication accounting.
7. Privacy amplification.
8. Final key.

## `/tools/attack-explorer`

Simulation-only educational modules:

- Intercept-resend.
- Photon-number splitting risk indicator.
- Detector-efficiency mismatch.
- Trojan-horse leakage risk indicator.
- Background-light denial of service.

Each module must show assumptions and countermeasure concepts without operational attack instructions.

## `/tools/etsi-api-sandbox`

Mock key-delivery API playground.

UI:

- Key pool status.
- Request form: application ID, key length, number of keys, priority.
- Response viewer.
- API examples.
- Error state examples.

## `/tools/kms-simulator`

Key-management simulator.

Inputs:

- Key generation rate.
- Key consumption services.
- Buffer capacity.
- Key TTL.
- Priority policy.
- Simulation duration.

Outputs:

- Buffer over time.
- Dropped/denied requests.
- Exhaustion probability or exhaustion time.
- Service-level summary.

## `/tools/hybrid-decision-tool`

Neutral questionnaire comparing PQC-only, QKD-only, and hybrid approaches.

Inputs:

- Use case.
- Distance/topology.
- Trust model.
- Bandwidth/key-rate need.
- Availability requirements.
- Budget/operational maturity.
- Compliance constraints.

Outputs:

- Scorecard.
- Recommended architecture category.
- Red flags.
- Explanation of assumptions.

## `/tools/openapi-viewer`

Internal contract viewer for the local mock APIs and simulation endpoints.

Outputs:

- Contract title, version, and server roots.
- Endpoint inventory with method, path, request schema, response codes, and path-parameter summary.
- Schema inventory with required fields and property lists.
- Raw checked-in `contracts/openapi.yaml` text for audit and debugging.

## `/tools/phase-encoding-calculator`

Mach-Zehnder and phase-encoding design helper.

Outputs:

- Fiber path difference from time-bin separation.
- Round-trip delay.
- Phase shift from length change.
- Coherence-length compatibility.
- Thermal drift estimate.

## `/tools/channel-planner`

Fiber/free-space/satellite channel dB planner.

Outputs:

- Total loss.
- Detection probability.
- Link availability notes.
- Background/noise contribution.
- Secure-key-rate estimate using simplified QKD model.

## `/tools/mdi-qkd-estimator`

Two-arm teaching estimator for measurement-device-independent QKD.

Outputs:

- Alice and Bob arm loss budgets into the middle relay.
- Relay-arm symmetry and interference-visibility penalty.
- Joint Bell-state announcement probability.
- Relay-noise-driven QBER proxy.
- Asymptotic secret-key-rate teaching estimate with explicit relay assumptions.

## `/tools/twin-field-qkd-estimator`

Twin-field teaching estimator for middle-station interference and phase-stability limits.

Outputs:

- Alice and Bob arm loss budgets into the central interference station.
- Phase-tracking efficiency, RMS phase-error, and post-selection teaching penalties.
- Middle-station click probability, QBER proxy, and secret-key-rate teaching estimate.
- Symmetry and interference penalties across a total-distance sweep.
- Explicit language that TF-QKD advantages depend on strong phase control, decoy analysis, and non-certified assumptions.

## `/tools/cv-qkd-estimator`

Continuous-variable QKD teaching estimator.

Outputs:

- Channel transmittance and total loss.
- Excess-noise, receiver-noise, and total-noise accounting in shot-noise units.
- SNR, mutual-information proxy, and Eve-information/Holevo-style teaching proxy.
- Covariance-style received-variance, covariance, and correlation outputs.
- Distance sweep for SNR and secret-key-rate intuition with explicit trusted-receiver assumptions.

## `/tools/entanglement-qkd-estimator`

Entanglement-based BBM92 and E91 teaching estimator.

Outputs:

- Separate Alice and Bob arm loss budgets from a source-in-the-middle model.
- Pair-collection and accidental-coincidence probability accounting.
- QBER, sifted/key-generation rates, and asymptotic secret-key-rate teaching output.
- CHSH-style Bell-score proxy and Bell-violation margin for E91-style monitoring.
- Clear language that entanglement-based assumptions differ from prepare-and-measure BB84 and remain non-certified.

## `/tools/paper-parameter-extractor`

Paste paper abstract/table text and extract structured parameters.

Outputs:

- Protocol.
- Distance.
- Loss.
- QBER.
- Key rate.
- Wavelength.
- Repetition rate.
- Detector efficiency.
- Dark count rate.
- Confidence flags.

## `/tools/report-generator`

Takes a saved or pasted run JSON and produces Markdown plus JSON report.

## `/tools/standards-conformance`

Checks whether mock API responses match expected response schema and key lifecycle rules.

## `/networks`

Directory for network tools.

## `/networks/scenario-builder`

Graph or structured editor for quantum-network scenarios.

Minimum viable version may use editable tables for nodes and links if a full graph canvas is not implemented immediately.

## `/networks/entanglement-routing`

Route ranking tool.

Outputs:

- Candidate paths.
- Estimated success probability.
- Estimated end-to-end fidelity.
- Latency and memory warning.

## `/networks/repeater-optimizer`

Optimizes repeater spacing/count in a simplified chain.

Outputs:

- Best number of repeaters.
- Segment length.
- Success probability proxy.
- Fidelity proxy.
- Rate proxy.

## `/networks/benchmark-hub`

Scenario runner and cross-simulator export hub.

For MVP:

- Built-in simplified engine.
- Export scenario JSON.
- Export concrete simulator-mapping JSON for SeQUeNCe, QuISP, NetSquid/SquidASM, and QKDNetSim.
- Show per-adapter validation status and mapping assumptions before download.

## `/resources`

Resource map.

Subpages:

- `/resources/model-limitations`
- `/resources/simulators`
- `/resources/standards`
- `/resources/protocols`
