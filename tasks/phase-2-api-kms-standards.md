# Codex task - Phase 2 API, KMS, and standards MVP

Read:

- `docs/API_SPEC.md`
- `contracts/openapi.yaml`
- `docs/SIMULATION_SPEC.md`

Implement:

- Mock QKD key pool in `lib/standards/etsiMock.ts`.
- API routes: `/api/qkd-mock/status`, `/api/qkd-mock/keys/request`, `/api/qkd-mock/keys/[keyId]`.
- `lib/kms/simulator.ts` and `/api/simulations/kms/run`.
- Pages: `/tools/etsi-api-sandbox`, `/tools/kms-simulator`, `/tools/standards-conformance`, `/tools/hybrid-decision-tool`.
- Conformance checker for mock API JSON shapes and lifecycle behavior.

Acceptance:

- Key requests reduce the available pool.
- Over-large requests return an insufficient-material error.
- KMS simulation shows buffer timeline and denied requests.
- Hybrid decision tool returns a neutral scorecard for PQC-only, QKD-only, and hybrid architectures.
