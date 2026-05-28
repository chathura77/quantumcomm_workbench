# Architecture spec

## Recommended stack

- Next.js App Router with TypeScript.
- React server and client components as appropriate.
- Tailwind CSS for styling.
- Zod for input validation and API schemas.
- Recharts, SVG, or Canvas for charts.
- Vitest for unit tests.
- Optional Playwright smoke tests.

## Runtime model

The MVP should run as a standard web application with mostly client-side calculators and server-side API routes for mock key-delivery behavior.

Pure simulation functions should have no dependency on React, browser APIs, or Next.js. This makes them reusable in API routes, tests, and later CLI/batch runs.

## Suggested repository structure

```text
app/
  layout.tsx
  page.tsx
  globals.css
  learn/
    page.tsx
    [protocol]/page.tsx
  tools/
    page.tsx
    qkd-engineering-lab/page.tsx
    link-budget/page.tsx
    qber-forensics/page.tsx
    post-processing/page.tsx
    attack-explorer/page.tsx
    etsi-api-sandbox/page.tsx
    kms-simulator/page.tsx
    hybrid-decision-tool/page.tsx
    phase-encoding-calculator/page.tsx
    channel-planner/page.tsx
    paper-parameter-extractor/page.tsx
    report-generator/page.tsx
    standards-conformance/page.tsx
  networks/
    page.tsx
    scenario-builder/page.tsx
    entanglement-routing/page.tsx
    repeater-optimizer/page.tsx
    benchmark-hub/page.tsx
  resources/
    page.tsx
    simulators/page.tsx
    standards/page.tsx
    protocols/page.tsx
  api/
    simulations/
    qkd-mock/
components/
  layout/
  cards/
  forms/
  charts/
  results/
  export/
lib/
  qkd/
    linkBudget.ts
    qber.ts
    postProcessing.ts
    attacks.ts
    phaseEncoding.ts
    channelPlanner.ts
  kms/
    keyPool.ts
    simulator.ts
  network/
    scenario.ts
    routing.ts
    repeater.ts
    benchmark.ts
  standards/
    etsiMock.ts
    conformance.ts
  export/
    report.ts
  validation/
    schemas.ts
data/
  fixtures/
tests/
  qkd/
  network/
  kms/
contracts/
docs/
```

## State and persistence

Use local component state and local storage for MVP user scenarios. The mock key API may use an in-memory store for the development server. Make it clear that the mock store resets on server restart.

If persistence is added later, isolate persistence behind repositories:

```text
lib/repositories/scenarios.ts
lib/repositories/runs.ts
lib/repositories/resources.ts
```

## API design

Internal API routes should validate payloads and return typed JSON. API routes should mirror the OpenAPI contract in `contracts/openapi.yaml`.

All calculator APIs should include:

- `input`: validated input payload.
- `result`: numerical output.
- `assumptions`: list of formula assumptions.
- `warnings`: list of warnings or limit violations.
- `version`: model version string.

## Model versioning

Each simulation function should expose or return a model version string, for example:

```ts
const MODEL_VERSION = "qkd-link-budget.simplified.v1";
```

Exports should include the model version.

## Error handling

Use typed validation errors. User-facing errors must be clear and unit-aware:

- "Fiber length must be between 0 and 1000 km."
- "QBER must be between 0 and 0.5 for this simplified key-rate formula."
- "Requested key length exceeds the current mock key pool."

## Security posture

The app should not store real secrets. Mock keys should be visibly marked demo-only. Attack explorer modules should be educational and non-operational.
