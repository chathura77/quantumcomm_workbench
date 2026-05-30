# Roadmap

## Phase 0 - Repository setup

Deliverables:

- Next.js + TypeScript app.
- Tailwind and base components.
- Routes created.
- Domain models and validation schemas.
- Unit test setup.

## Phase 1 - QKD Engineering MVP

Deliverables:

- Link-budget calculator.
- QBER forensics.
- Post-processing workbench.
- Integrated QKD Engineering Lab.
- Exportable run reports.

## Phase 2 - Standards and key-management MVP

Deliverables:

- ETSI-style QKD mock API.
- API sandbox UI.
- KMS simulator.
- Standards conformance checker.
- Hybrid PQC + QKD decision tool.

## Phase 3 - Optical/channel design MVP

Deliverables:

- Phase-encoding calculator.
- Fiber/free-space/satellite channel planner.
- Attack explorer modules.
- Educational safety and model limitation copy.

## Phase 4 - Quantum network MVP

Deliverables:

- Scenario builder.
- Scenario schema validation.
- Entanglement route ranking.
- Repeater-chain optimizer.
- Benchmark hub with built-in simplified engine.

## Phase 5 - Research utilities

Deliverables:

- Resource map.
- Protocol directory.
- Paper-to-parameter extractor.
- Report generator.
- References page.

## Phase 6 - Product hardening

Deliverables:

- Automated smoke tests for pages and key API endpoints.
- Accessibility improvements for keyboard flow, labels, contrast, and chart summaries.
- Replace the footer source-link placeholder.
- Desktop, tablet, and mobile visual QA where practical.
- Stronger loading, empty, and error states across tools.

Current progress notes:

- Route smoke coverage now asserts every current `app/page.tsx` page renders non-empty markup and every current `app/api/**/route.ts` endpoint is explicitly exercised in the test suite.
- Route-inventory hardening now keeps `docs/ROUTES_AND_PAGES.md` synchronized with the actual `app/**/page.tsx` tree through an automated test, reducing documentation drift when new pages land.
- API smoke coverage includes representative success paths plus validation, insufficient-material, and not-found error cases for the current Phase 0-5 endpoints.
- Shared UI controls now expose explicit helper-text associations, stronger keyboard focus rings, accessible chart summaries, and reusable loading/error/empty states across the major route groups.
- JSON-heavy tools now use shared accessible textarea and checkbox controls, disable actions while inputs are invalid, and surface clearer recovery copy for report generation, conformance checking, scenario editing, and empty extractor/filter states.
- The scenario-builder node/link edit tables now expose explicit row-scoped labels and remove-action names for every cell control, closing a remaining keyboard/screen-reader gap in the Phase 6 accessibility slice.
- Added a committed desktop/tablet/mobile visual-QA checklist so responsive review has a stable route set and explicit acceptance points for navigation, charts, forms, and footer content.

## Phase 7 - Saved runs and scenario library

Deliverables:

- Local saved runs for completed tool outputs.
- Run history with duplicate, compare, and delete actions.
- Saved scenario library with import/export bundles.
- Shareable URL state for calculators where practical.
- Report generator integration with saved runs.

Current progress notes:

- Tool result panels that already support export now also support local browser save, preserving inputs, results, assumptions, warnings, formulas, and model version under a shared saved-run history key.
- The report generator can now preload locally saved runs, compare two saved runs, duplicate prior runs for branch analysis, and delete stale local history entries without requiring pasted JSON first.
- The network scenario builder now supports a local saved scenario library with load, duplicate, delete, and exported warning counts, plus saved-scenario bundle import/export for browser-local portability.
- The link-budget and finite-key BB84 calculators now keep their current teaching inputs in shareable URL state and expose a copy-link action that never includes key material or telemetry.

## Phase 8 - QKD model depth v2

Deliverables:

- Finite-key BB84 teaching model with explicit epsilon/security parameters.
- Stronger decoy-state BB84 lower-bound estimator.
- Detector dead time, afterpulsing, basis bias, and uncertainty bands.
- Sensitivity sweeps for distance, loss, QBER, detector efficiency, and block size.
- Clear non-certified modeling language on every advanced output.

Current progress notes:

- Added a dedicated finite-key BB84 teaching estimator page and API route with explicit correctness, secrecy, and parameter-estimation epsilon controls.
- The finite-key slice now reuses the transparent link-budget proxy, exposes every penalty term in bits, and labels the result as a non-certified teaching lower bound rather than an operational proof.
- Added finite-key sensitivity sweeps for distance, added loss, observed QBER, detector efficiency, and block size, plus a distance-based statistical uncertainty band that distinguishes observed-QBER, PE-only, and full-slack cases.
- The shared BB84 teaching kernel now exposes detector dead-time, afterpulsing, and sender/receiver basis-bias controls, and the finite-key page surfaces those proxies in both the accounting view and exported formulas.
- The decoy-state BB84 mode now exposes a clearer single-photon lower-bound teaching breakdown, including single-photon gain/error proxies, multi-photon emission mass, and the pre-finite-key decoy lower-bound rate in both exports and UI panels.

## Phase 9 - Specialized protocol estimators

Deliverables:

- MDI-QKD two-arm estimator with relay assumptions.
- CV-QKD teaching estimator with excess noise and reconciliation controls.
- Twin-field QKD phase-stability and middle-station estimator.
- Entanglement-based BBM92/E91 link model separated from BB84 prepare-and-measure assumptions.

Current progress notes:

- Added an MDI-QKD relay estimator page and API route with explicit Alice/Bob arm lengths, relay trust mode, Bell-state-measurement efficiency, interference visibility, and asymptotic key-rate teaching outputs.
- The MDI slice reports per-arm loss budgets, relay-arm symmetry, coincidence probability, relay-noise QBER, and a distance sweep while clearly labeling the model as a non-certified instructional proxy.
- Added a twin-field QKD teaching estimator page and API route with explicit middle-station trust mode, RMS phase-error, phase-tracking efficiency, and post-selection controls.
- The twin-field slice reports per-arm loss, symmetry, phase-stability penalty, middle-station click probability, QBER proxy, and total-distance sweeps while clearly labeling phase-reference and decoy-analysis assumptions.
- Added a CV-QKD teaching estimator page and API route with homodyne/heterodyne selection, trusted-vs-untrusted receiver noise assumptions, excess-noise controls, reconciliation efficiency, and covariance-style observable outputs.
- The CV-QKD slice reports SNR, received variance, covariance proxy, trusted/untrusted noise accounting in shot-noise units, and a distance sweep for secret-key-rate intuition without claiming covariance-matrix security proofs.
- Added an entanglement-based BBM92/E91 estimator page and API route with source-in-the-middle arm losses, pair-collection vs accidental-coincidence accounting, CHSH-style Bell-score teaching outputs, and explicit separation from prepare-and-measure BB84 assumptions.

## Phase 10 - Real simulator export adapters

Deliverables:

- Concrete export adapters for SeQUeNCe, QuISP, NetSquid/SquidASM, and QKDNetSim.
- Adapter validation tests.
- Scenario-schema mapping documentation for each simulator family.

Current progress notes:

- Benchmark Hub now exports concrete simulator-mapping JSON for SeQUeNCe, QuISP, NetSquid/SquidASM, and QKDNetSim instead of placeholder payloads.
- Added pure TypeScript adapter validation so every exported family is checked for required topology blocks before download.
- Added `docs/SIMULATOR_ADAPTERS.md` to document how the shared scenario schema maps into each simulator family while preserving the demo-only, no-secret-material guardrails.

## Phase 11 - ETSI/KMS conformance v2

Deliverables:

- Expanded ETSI GS QKD 014-style response shapes.
- Key lifecycle behavior including TTL aging, cleanup, refill simulation, and mock authorization.
- OpenAPI viewer page.
- Conformance test cases and downloadable mock API examples.

Current progress notes:

- Added a contract-backed OpenAPI viewer page under `/tools/openapi-viewer` so the checked-in `contracts/openapi.yaml` can be inspected in-app by endpoint, schema, and raw YAML.
- The viewer is generated from a local parser in `lib/standards/openapi.ts`, keeping the route inventory and schema summary tied to the same source contract used by the standards documentation.
- The ETSI mock sandbox now ships with downloadable static example payload bundles for ready-status, request-success, insufficient-material, and descriptor-retrieval drills.
- The standards conformance checker now includes built-in passing and failing example cases so schema and lifecycle expectations can be exercised without hand-authoring JSON first.
- The ETSI mock now enforces demo-only application authorization headers, tracks active versus expired issued keys, cleans expired descriptors from the live pool, and reports TTL lifecycle metadata in `/api/qkd-mock/status`.
- The sandbox can now request and retrieve demo keys with header-token auth, while the contract, examples, and conformance suite cover unauthorized and expired-key response shapes alongside the existing success and insufficient-material paths.

## Phase 12 - Teaching labs

Deliverables:

- Guided BB84 and E91 labs.
- Teleportation and entanglement-swapping visual labs.
- Worksheet mode with prompts, expected observations, and exportable answers.
- Citation-backed explainers without turning pages into textbooks.

Current progress notes:

- Added guided BB84 and E91 lab sections directly on the protocol explainer pages so the learning flow stays attached to the existing mini-demos instead of splitting into placeholder routes.
- Each guided lab now includes worksheet prompts, expected observations, answer fields, and exportable JSON/Markdown notes for classroom or self-study handoff.
- The BB84 worksheet makes sifting and disturbance visible row by row, while the E91 worksheet keeps Bell-threshold intuition explicit and clearly labeled as non-device-independent teaching content.

## Phase 13 - Deployment and CI

Deliverables:

- GitHub Actions for lint, typecheck, test, and build.
- Playwright smoke tests.
- Dockerfile or deployment documentation.
- Dependency audit workflow.
- Release checklist.

Current progress notes:

- Added a baseline GitHub Actions CI workflow that runs `npm ci`, lint, typecheck, tests, and production build on pushes and pull requests.
- Added a built-server HTTP smoke suite that boots the production Next app, exercises representative routes and key API endpoints end-to-end, and runs in CI after `npm run build` without requiring extra browser dependencies.
- Added a scheduled dependency-audit workflow so high-severity npm vulnerabilities surface without relying on ad hoc local checks.
- Added deployment and release runbooks in `docs/DEPLOYMENT.md` and `docs/RELEASE_CHECKLIST.md`, keeping the demo-only posture and manual visual QA expectations explicit.

## Later research-grade improvements

- Real finite-key analysis modules for selected QKD protocols.
- Decoy-state parameter optimization.
- CV-QKD covariance matrix modeling.
- MDI-QKD and TF-QKD specialized estimators.
- External simulator adapters for SeQUeNCe, QuISP, NetSquid/SquidASM, and QKDNetSim.
- Persistent scenario database and public scenario gallery.
- Account-based saved runs.
- Batch parameter sweeps.
- Notebook export with executable Python.
- Hardware calibration import formats.
