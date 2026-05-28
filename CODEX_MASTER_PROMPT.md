# Codex task: build QuantumComm Workbench

You are working in a repository that contains a build pack for QuantumComm Workbench. Read `AGENTS.md` first, then read all files under `docs/`, `contracts/`, `fixtures/`, and `tasks/` before coding.

## Goal

Create the first production-quality MVP of QuantumComm Workbench: a Next.js + TypeScript website for quantum communication researchers, educators, engineers, and enthusiasts.

The app must implement the proposed structure:

```text
/
/learn
/learn/[protocol]
/tools
/tools/qkd-engineering-lab
/tools/link-budget
/tools/qber-forensics
/tools/post-processing
/tools/attack-explorer
/tools/etsi-api-sandbox
/tools/kms-simulator
/tools/hybrid-decision-tool
/tools/phase-encoding-calculator
/tools/channel-planner
/tools/paper-parameter-extractor
/tools/report-generator
/tools/standards-conformance
/networks
/networks/scenario-builder
/networks/entanglement-routing
/networks/repeater-optimizer
/networks/benchmark-hub
/resources
/resources/simulators
/resources/standards
/resources/protocols
/api/*
```

## Required first-pass behavior

Build a working MVP, not only static pages. Implement at least these functional vertical slices:

1. Home page and navigation with the main sections.
2. Learn section with protocol cards and detailed pages for BB84, E91, MDI-QKD, CV-QKD, teleportation, and entanglement swapping.
3. QKD link-budget calculator with presets and charts.
4. QBER forensics dashboard using transparent additive contribution models.
5. Post-processing workbench estimating sifting, reconciliation leakage, authentication cost, privacy amplification, and final key length.
6. Attack explorer with simulation-only modules for intercept-resend, photon-number splitting, detector-efficiency mismatch, Trojan-horse leakage, and denial-of-service/background light.
7. ETSI-style QKD mock API sandbox with key pool status, request keys, retrieve keys, and key exhaustion behavior.
8. KMS simulator with key generation, consumption, buffers, priorities, and exhaustion probability over time.
9. Hybrid PQC + QKD decision tool with a neutral scorecard and explanation.
10. Phase-encoding calculator for delay length, phase shift, coherence constraints, and thermal drift.
11. Channel planner for fiber, free-space, and satellite-style links using simplified dB accounting.
12. Network scenario builder with graph editor or structured form input and JSON export/import.
13. Entanglement routing sandbox using graph paths, link success probability, fidelity, memory lifetime, and route ranking.
14. Repeater-chain optimizer using simplified repeater spacing and target fidelity/rate tradeoffs.
15. Cross-simulator benchmark hub with scenario definition, baseline built-in engine, and export adapters/placeholders for SeQUeNCe, QuISP, NetSquid/SquidASM, and QKDNetSim.
16. Resource map seeded from `fixtures/resources.json`.
17. Paper-to-parameter extractor using rule-based extraction for common quantities like distance, loss, QBER, key rate, detector efficiency, dark count rate, repetition rate, protocol, and wavelength.
18. Report generator that exports a Markdown and JSON report for any completed tool run.
19. Standards conformance checker for the MVP mock QKD API response shapes.

If a feature is too large for a full implementation, create a useful simplified MVP implementation rather than a blank placeholder. Keep all assumptions visible in the UI.

## Engineering requirements

- Use TypeScript throughout.
- Put simulation kernels in `lib/qkd`, `lib/network`, `lib/kms`, and `lib/standards`.
- Add unit tests for simulation kernels.
- Validate API inputs with Zod.
- Add reusable components for cards, forms, charts, result panels, formula panels, and export buttons.
- Use fixtures from `fixtures/` as seed data.
- Add `README.md` setup instructions for the generated app.
- Add `docs/MODEL_LIMITATIONS.md` explaining what is simplified.
- Add `docs/SCENARIO_FORMAT.md` based on `contracts/quantum-network-scenario.schema.json`.
- Keep user-facing claims scientifically cautious.

## Suggested implementation sequence

1. Inspect existing files and create the Next.js app if no app exists.
2. Add domain models and pure simulation kernels first.
3. Add tests for kernels.
4. Add shared UI components and global layout.
5. Add the route tree and functional pages.
6. Add API routes.
7. Wire export/report utilities.
8. Run format, lint, typecheck, tests, and build.
9. Fix issues until the app builds and tests pass.
10. Summarize what was implemented and list follow-up tasks.

## Do not

- Do not create only a design document.
- Do not leave empty placeholder pages.
- Do not claim the models are certified or production security tools.
- Do not add real secret-key production or live cryptographic key integration.
- Do not call external paid APIs.
- Do not require a database for the MVP.

## Acceptance criteria

The work is successful when:

- `npm install`, `npm run test`, and `npm run build` succeed.
- The home page links to all major sections.
- Each listed route renders without runtime errors.
- Link-budget, QBER, post-processing, KMS, attack explorer, channel planner, entanglement routing, and repeater optimizer produce numerical outputs from editable inputs.
- Mock QKD API routes return validated JSON and support key-pool exhaustion behavior.
- Scenario import/export works with the JSON schema in `contracts/`.
- Report export produces reproducible JSON and Markdown.
- The codebase is modular enough for later replacement of simplified kernels with research-grade engines.
