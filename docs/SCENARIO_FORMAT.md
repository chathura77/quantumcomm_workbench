# Quantum network scenario format

The MVP scenario format follows `contracts/quantum-network-scenario.schema.json`.

## Required top-level fields

- `id`: stable scenario identifier.
- `name`: human-readable name.
- `nodes`: one or more nodes.
- `links`: zero or more links between nodes.

Optional fields are `description` and `metadata`.

## Nodes

Each node requires:

- `id`
- `label`
- `type`

Supported node types are `endpoint`, `trusted_node`, `repeater`, `satellite`, `ground_station`, and `memory_node`.

Optional node fields are `memoryLifetimeMs`, `memoryCount`, `x`, and `y`.

## Links

Each link requires:

- `id`
- `source`
- `target`
- `lengthKm`

Optional link fields are `attenuationDbPerKm`, `lossDb`, `successProbability`, `fidelity`, and `classicalLatencyMs`.

The routing MVP treats links as undirected for path discovery, multiplies link success probabilities, and uses a Werner-state proxy for entanglement swapping fidelity.

## Saved scenario bundles

The scenario builder can also export a browser-local saved-scenarios bundle for offline reuse and comparison.

- Bundle version: `quantumcomm.saved-scenarios.bundle.v1`
- Bundle fields: `version`, `exportedAt`, and `scenarios`
- Each saved scenario entry includes `id`, `title`, `createdAt`, `scenario`, and any trust-assumption or validation warnings captured when the entry was saved.

## Simulator adapter bundles

The benchmark hub can export simulator-oriented adapter bundles derived from the same scenario schema.

- Bundle version: `quantumcomm.simulator-adapters.bundle.v1`
- Bundle fields: `version`, `exportedAt`, `scenarioId`, and `adapters`
- Each adapter entry includes `name`, `filename`, `status`, `validation`, and `content`
- Supported simulator families: `SeQUeNCe`, `QuISP`, `NetSquid/SquidASM`, and `QKDNetSim`
- Mapping details live in `docs/SIMULATOR_ADAPTERS.md`
