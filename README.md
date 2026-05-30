# QuantumComm Workbench

QuantumComm Workbench is a Next.js + TypeScript MVP for quantum communication learning, engineering estimates, mock QKD integration, and quantum-network scenario exploration.

The app is intentionally cautious: outputs are educational and research-oriented estimates, not certified security guarantees or production cryptographic validation.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

For responsive/manual UI review after layout or shared-component changes, use `docs/VISUAL_QA.md`.

## Implemented MVP areas

- Learn pages for BB84, E91, BBM92, decoy-state BB84, MDI-QKD, TF-QKD, CV-QKD, teleportation, entanglement swapping, and quantum repeaters.
- QKD engineering tools: link budget, finite-key BB84 teaching estimator, QBER forensics, post-processing, attack explorer, phase encoding, channel planner, paper extractor, and report generator.
- Standards and integration tools: ETSI-style mock QKD API sandbox, KMS simulator, standards conformance checker, and hybrid PQC + QKD decision tool.
- Network tools: scenario builder, entanglement routing, repeater optimizer, and benchmark hub with concrete simulator-mapping exports for external simulators.
- API routes under `/api/simulations/*`, `/api/qkd-mock/*`, and `/api/export/report`.

## Key files

- Pure kernels: `lib/qkd`, `lib/kms`, `lib/network`, `lib/standards`.
- Validation: `lib/validation/schemas.ts`.
- UI routes: `app/`.
- Seed fixtures: `fixtures/`.
- Contracts and docs: `contracts/`, `docs/`.

## Model limitations

Read `docs/MODEL_LIMITATIONS.md` before interpreting results. The MVP favors transparent formulas and reproducible exports over research-grade physical modeling.
