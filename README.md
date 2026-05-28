# QuantumComm Workbench Codex Build Pack

This pack is designed to be copied into a new or existing repository and used with Codex to build the QuantumComm Workbench website.

## Recommended use

1. Create an empty Git repository.
2. Copy every file in this pack into the repository root.
3. Start Codex in that repository.
4. Paste `CODEX_MASTER_PROMPT.md` as the first task.
5. After the first implementation pass, run the tasks in `tasks/` one by one.

Codex reads `AGENTS.md` before doing work, so keep that file in the repository root. It contains the persistent engineering instructions for the project.

## Intended product

QuantumComm Workbench is a web platform for quantum communication researchers, educators, engineers, and enthusiasts. It includes:

- Educational protocol labs: BB84, E91, BBM92, MDI-QKD, CV-QKD, teleportation, entanglement swapping.
- QKD engineering tools: link budget, secret-key-rate estimates, QBER forensics, post-processing, attack explorer, channel planners.
- Standards and integration tools: ETSI-style QKD key-delivery mock API, key-management simulator, conformance checker.
- Quantum network tools: scenario builder, entanglement routing sandbox, repeater-chain optimizer, cross-simulator benchmark hub.
- Research utilities: resource map, paper-to-parameter extractor, reproducible report/notebook generator.

## File map

- `CODEX_MASTER_PROMPT.md`: paste this into Codex for the initial build.
- `AGENTS.md`: persistent Codex project instructions.
- `docs/PRODUCT_SPEC.md`: product requirements and user personas.
- `docs/ARCHITECTURE.md`: recommended stack and repo structure.
- `docs/ROUTES_AND_PAGES.md`: site map and page-level behavior.
- `docs/API_SPEC.md`: internal API endpoints and semantics.
- `docs/DATA_MODELS.md`: TypeScript domain models.
- `docs/SIMULATION_SPEC.md`: simulation kernels and formulas.
- `docs/UI_SPEC.md`: interface and component requirements.
- `docs/ACCEPTANCE_TESTS.md`: acceptance criteria and tests.
- `docs/ROADMAP.md`: phased implementation plan.
- `docs/RESEARCH_SOURCES.md`: sources and domain references to cite in the app.
- `contracts/openapi.yaml`: API contract for calculator and mock QKD endpoints.
- `contracts/quantum-network-scenario.schema.json`: reusable scenario schema.
- `contracts/simulation-job.schema.json`: simulation job schema.
- `fixtures/*.json`: seed resources, protocols, and sample scenarios.
- `tasks/*.md`: follow-up Codex tasks for iterative implementation.

## Scope control

The first version should be a polished, working MVP with all pages present and the most important tools functional using transparent simplified models. Advanced physical models, external simulator adapters, and full cryptographic implementations can be added incrementally. Every page should clearly label assumptions and avoid presenting simplified educational calculations as certified security analyses.
