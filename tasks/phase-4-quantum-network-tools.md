# Codex task - Phase 4 quantum network MVP

Read:

- `contracts/quantum-network-scenario.schema.json`
- `fixtures/sample-scenarios.json`
- `docs/SIMULATION_SPEC.md`
- `docs/ROUTES_AND_PAGES.md`

Implement:

- `lib/network/scenario.ts` validation/import/export.
- `lib/network/routing.ts` route ranking.
- `lib/network/repeater.ts` repeater optimizer.
- `lib/network/benchmark.ts` built-in simplified benchmark runner.
- Pages: `/networks/scenario-builder`, `/networks/entanglement-routing`, `/networks/repeater-optimizer`, `/networks/benchmark-hub`.

Acceptance:

- Sample scenarios load and validate.
- Users can edit nodes and links in tables.
- Users can export/import scenario JSON.
- Route ranking returns candidate paths with rate, fidelity, latency, and warnings.
- Repeater optimizer returns candidate list and best candidate.
- Benchmark hub can run built-in engine and export scenario adapters/placeholders.
