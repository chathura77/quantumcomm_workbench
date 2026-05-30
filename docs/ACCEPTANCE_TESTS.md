# Acceptance tests

## Build and quality gates

Run:

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

If the generated project uses different scripts, provide equivalent scripts in `package.json` and document them in the generated README.

## Global UI acceptance

- Home page renders and links to Learn, Tools, Networks, Resources.
- Footer disclaimer is visible.
- Every route listed in `docs/ROUTES_AND_PAGES.md` renders without runtime errors.
- No page is a blank placeholder.
- Tool pages include input controls, results, assumptions, warnings, and export action.
- Invalid inputs show helpful validation messages.

## Simulation unit tests

### Binary entropy

- `h2(0) == 0`.
- `h2(1) == 0`.
- `h2(0.5)` is approximately 1.
- Function handles small epsilon values without NaN.

### Link budget

Test case:

- length = 0 km should have higher secret-key rate than length = 100 km, all else equal.
- Increasing dark count probability should increase QBER.
- Increasing fiber loss should reduce channel transmittance.
- QBER above the threshold should produce zero or near-zero secret fraction and a warning.

### Post-processing

- Final key bits must never be negative.
- Increasing QBER should not increase final key bits for fixed raw detections.
- Increasing authentication cost should reduce final key bits.

### QBER forensics

- Eve intercept fraction 1.0 should add approximately 0.25 QBER contribution in the simplified model.
- Contributions plus residual should equal measured QBER within tolerance.

### Attack explorer

- Intercept-resend risk increases with Eve fraction.
- Photon-number splitting risk increases with mean photon number.
- Background-light DoS risk increases with background count probability.

### KMS simulator

- If generation rate exceeds consumption rate and buffer is not full, buffer should increase.
- If consumption exceeds generation and initial buffer is small, denied requests should occur.
- Buffer must never exceed capacity or go below zero.

### Network routing

- Route finder returns at least one path for connected source and target.
- Removing a link from the only path returns no route and a warning.
- Higher link loss or lower success probability reduces route score.

### Repeater optimizer

- Candidates are generated for repeaters 0..maxRepeaters.
- Segment length decreases as repeaters increase.
- A best candidate is selected.

## API acceptance

### Link budget API

- Valid payload returns status 200 and expected result fields.
- Invalid negative length returns validation error.

### Mock QKD API

- `GET /api/qkd-mock/status` returns available bits.
- `POST /api/qkd-mock/keys/request` returns key IDs when enough bits exist.
- Requesting more bits than available returns an insufficient-material error.
- Key material is marked demo-only.

### Scenario import/export

- Sample scenario from `fixtures/sample-scenarios.json` validates against the schema.
- Exported scenario can be imported without data loss.

## Manual smoke tests

1. Open `/tools/link-budget`, select Metro fiber preset, change distance, verify chart and result update.
2. Open `/tools/qber-forensics`, increase background noise, verify contribution and likely cause update.
3. Open `/tools/post-processing`, increase QBER, verify final key decreases.
4. Open `/tools/etsi-api-sandbox`, request multiple keys until key exhaustion occurs.
5. Open `/tools/kms-simulator`, add a high-consumption service, verify denial/exhaustion output.
6. Open `/networks/scenario-builder`, import sample scenario, export it, then run route ranking.
7. Open `/tools/report-generator`, paste exported JSON, produce Markdown report.
8. Run the desktop/tablet/mobile checklist in `docs/VISUAL_QA.md` after shared UI or layout changes.
