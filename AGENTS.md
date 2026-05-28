# AGENTS.md - QuantumComm Workbench

## Mission

Build a production-quality web application called QuantumComm Workbench: a browser-based platform for quantum communication learning, engineering estimation, QKD integration sandboxes, and quantum-network scenario exploration.

## Product principles

1. Scientific transparency: every calculator must show assumptions, formulas, units, and limitations.
2. Research utility: export parameters, results, plots, and reports as reproducible JSON and Markdown.
3. Safety and ethics: attack modules are simulation-only educational models. Do not include operational instructions for attacking deployed QKD systems or real infrastructure.
4. Extensibility: simulation kernels must be pure TypeScript functions with unit tests and no UI dependency.
5. Usability: every tool must include presets, inline explanations, validation, and share/export actions.
6. Neutrality: QKD, PQC, and hybrid cryptography should be presented as complementary options with tradeoffs, not hype.

## Preferred technology stack

Use this stack unless the existing repository already has a clear alternative:

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Zod for input validation
- Recharts or lightweight SVG components for charts
- Vitest for simulation/unit tests
- Playwright or equivalent for essential end-to-end smoke tests if practical
- JSON fixtures for seed data in the MVP
- Optional: Prisma plus SQLite only if persistence is explicitly needed

Do not block the MVP on a database. Use local storage, fixtures, and deterministic pure functions first.

## Repository conventions

Suggested structure:

```text
app/
  page.tsx
  learn/
  tools/
  networks/
  resources/
  api/
components/
  charts/
  forms/
  layout/
  simulation/
lib/
  qkd/
  network/
  kms/
  standards/
  export/
  validation/
data/
  fixtures/
docs/
contracts/
tests/
```

## Implementation expectations

- Prefer complete vertical slices over isolated stubs.
- Each tool page should have a working default preset.
- Use deterministic random seeds where simulations need randomness.
- Validate all API input with Zod.
- Keep physics formulas in `lib/*` and test them in `tests/*`.
- Use accessible forms: labels, helper text, keyboard navigation, and clear units.
- Include loading, empty, and error states.
- Use responsive layouts that work on desktop and tablet widths.
- Add explanatory copy but avoid long textbook pages.
- Add citations or source links in a References section for scientific claims.
- Include a site-wide disclaimer: outputs are educational/research estimates, not certified security guarantees.

## Definition of done

A task is done when:

1. The app builds successfully.
2. Unit tests for any new simulation code pass.
3. Core user paths are manually verifiable from the UI.
4. Inputs are validated and invalid values show friendly errors.
5. Outputs include units and assumptions.
6. Exported JSON includes input parameters, result values, formulas used, timestamp, and version.
7. No page is an empty placeholder; unfinished advanced features have useful MVP behavior and a roadmap note.

## Domain cautions

- Do not claim unconditional security from simplified simulations.
- Distinguish ideal protocols from device imperfections and implementation attacks.
- Label trusted-node assumptions in QKD networks.
- Label finite-key effects separately from asymptotic approximations.
- Do not implement real cryptographic key use for production secrets in the mock API.
- Do not add secret keys, credentials, or telemetry without explicit user consent.
