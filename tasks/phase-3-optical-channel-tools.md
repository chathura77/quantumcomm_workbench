# Codex task - Phase 3 optical and channel tools

Read `docs/SIMULATION_SPEC.md` and `docs/ROUTES_AND_PAGES.md`.

Implement:

- `lib/qkd/phaseEncoding.ts`.
- `lib/qkd/channelPlanner.ts`.
- `/tools/phase-encoding-calculator`.
- `/tools/channel-planner`.
- Improved channel presets for fiber, free-space demo, and satellite-style pass.

Acceptance:

- Phase-encoding calculator computes path length difference, phase shift, coherence length, and thermal drift.
- Channel planner computes total dB loss and passes its result into the simplified QKD key-rate model.
- Both tools expose formulas and model limitations.
