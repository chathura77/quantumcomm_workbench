# Simulator adapter mappings

QuantumComm Workbench exports simulator-oriented JSON adapters from the benchmark hub. These files are transparent mapping artifacts for review and downstream scripting, not executable simulator jobs.

## Shared guardrails

- Export bundle version: `quantumcomm.simulator-adapters.bundle.v1`
- Source schema: `quantum-network-scenario.schema.v1`
- Exports include topology, loss, latency, fidelity, memory, and trust-role proxies only.
- Exports do not include secret keys, deployable cryptographic material, or production control-plane behavior.
- Fidelity, success probability, and memory lifetime remain educational proxies and must not be read as certified device models.

## SeQUeNCe

- Output schema: `quantumcomm.sequence.adapter.v1`
- Main mapping:
  - Workbench node -> `topology.nodes[]`
  - Workbench link -> `topology.quantumChannels[]`
  - Workbench link latency -> `topology.classicalChannels[]`
- Notes:
  - Distances are converted from km to meters.
  - Quantum and classical channels are separated explicitly.
  - No protocol timeline, detector stack, or application script is generated.

## QuISP

- Output schema: `quantumcomm.quisp.adapter.v1`
- Main mapping:
  - Workbench node -> `omnetpp.modules[]`
  - Workbench link -> `omnetpp.channels[]`
  - Teaching success/fidelity proxies -> `teachingMetadata[]`
- Notes:
  - The file is intended to seed downstream NED/INI authoring.
  - Stationary qubit counts are inferred from memory counts, with a minimal repeater floor.
  - Link probabilities are preserved as sidecar teaching metadata rather than runtime QuISP parameters.

## NetSquid/SquidASM

- Output schema: `quantumcomm.netsquid.adapter.v1`
- Main mapping:
  - Workbench node -> `pythonModel.nodes[]`
  - Workbench link -> `pythonModel.quantumLinks[]`
  - Benchmark route hint -> `pythonModel.experimentHints.builtInBalancedRoute`
- Notes:
  - Memory lifetime is converted from ms to ns for Python-side simulator setup.
  - The export stays JSON so the mapping remains inspectable before anyone writes simulator code around it.
  - Timing, loss, and fidelity remain simplified teaching proxies.

## QKDNetSim

- Output schema: `quantumcomm.qkdnetsim.adapter.v1`
- Main mapping:
  - Workbench node -> `ns3Topology.nodes[]`
  - Workbench link -> `ns3Topology.fiberLinks[]`
  - Trust and entanglement hints -> `qkdApplicationHints`
- Notes:
  - The adapter is shaped for NS-3/QKDNetSim scripting, not direct execution.
  - Trusted relays remain explicit through `keyRelayNodes`.
  - Entanglement-capable nodes are surfaced separately so relay assumptions stay visible.
