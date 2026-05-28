# Product spec - QuantumComm Workbench

## One-line description

QuantumComm Workbench is a browser-based workbench for learning, estimating, simulating, and integrating quantum communication systems.

## Primary audiences

### 1. Researchers and graduate students

Needs:

- Fast exploratory calculations before deeper simulation.
- Reproducible parameter sets.
- Scenario formats that can map to simulators.
- Clear assumptions and formulas.
- Exportable plots and reports.

### 2. Quantum communication engineers

Needs:

- Link budgets.
- QBER diagnostics.
- Key-management and key-consumption modeling.
- API mocks for application integration.
- Standards-oriented test cases.

### 3. Educators and enthusiasts

Needs:

- Visual protocol explanations.
- Interactive attack and countermeasure demos.
- Plain-language explanations with mathematical depth available.
- Safe, browser-native experimentation.

### 4. Security architects and decision makers

Needs:

- Neutral comparison of QKD, PQC, and hybrid approaches.
- Threat-model driven guidance.
- Deployment constraints and tradeoffs.
- Clear warnings about trusted nodes, device assumptions, cost, distance, and denial-of-service.

## Product pillars

1. Learn: protocol explainers and visual labs.
2. Tools: calculators, diagnostics, attack models, API sandboxes, and KMS simulations.
3. Networks: topology and quantum-network scenario exploration.
4. Resources: curated standards, simulators, papers, and reproducibility exports.

## Flagship modules

### QKD Engineering Lab

Combines link budget, QBER forensics, post-processing, and attack simulation into one integrated workflow.

Minimum behavior:

- Choose protocol preset.
- Set channel, source, detector, and post-processing parameters.
- Compute raw detections, sifted detections, QBER, reconciliation leakage, privacy amplification, final key length, and secret-key rate.
- Visualize sensitivity to distance and QBER.
- Export the run.

### ETSI-style API and KMS Sandbox

A mock key-delivery environment for developers.

Minimum behavior:

- Show a simulated key pool for Alice and Bob.
- Let users request a key with requested length and application ID.
- Return key ID and mock key material for demo only.
- Simulate depletion, refilling, key expiration, and service priority.
- Provide OpenAPI-style docs and copyable curl examples.

### Quantum Network Scenario Builder

A graph-based or form-based tool for defining networks.

Minimum behavior:

- Add nodes and links.
- Set node type: endpoint, trusted-node, repeater, satellite, ground station, memory node.
- Set link parameters: length, attenuation, success probability, classical latency, fidelity, detector efficiency.
- Export/import JSON matching the scenario schema.
- Run built-in route scoring and repeater optimization.

## Non-goals for MVP

- Certified security analysis.
- Production cryptographic key generation.
- Full finite-key security proof implementation.
- Full NS-3, NetSquid, QuISP, or SeQUeNCe execution in browser.
- Vendor-specific device control.
- Real-world attack instructions.

## Product tone

- Scientifically precise.
- Practical and engineering oriented.
- Cautious about security claims.
- Useful to specialists without alienating learners.

## Global disclaimer

Add a visible disclaimer in the footer and relevant tools:

"QuantumComm Workbench provides educational and research-oriented estimates. Simplified models are not a substitute for certified security proofs, calibrated hardware characterization, or production cryptographic validation."
