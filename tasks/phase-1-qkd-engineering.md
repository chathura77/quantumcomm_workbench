# Codex task - Phase 1 QKD engineering MVP

Read:

- `docs/SIMULATION_SPEC.md`
- `docs/DATA_MODELS.md`
- `docs/API_SPEC.md`
- `fixtures/presets.json`

Implement the QKD engineering vertical slice:

- `lib/qkd/linkBudget.ts`
- `lib/qkd/qber.ts`
- `lib/qkd/postProcessing.ts`
- `lib/qkd/attacks.ts`
- API routes for link budget, QBER, post-processing, and attack models.
- Pages: `/tools/qkd-engineering-lab`, `/tools/link-budget`, `/tools/qber-forensics`, `/tools/post-processing`, `/tools/attack-explorer`.
- Unit tests for all QKD kernels.
- Export JSON/Markdown for completed runs.

Acceptance:

- Link-budget distance sweep works.
- Increasing distance decreases transmittance.
- Increasing QBER decreases final key length.
- Attack explorer modules produce risk outputs and safety language.
- All QKD tool pages have editable parameters, presets, results, assumptions, warnings, and export.
