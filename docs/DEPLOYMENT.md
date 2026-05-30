# Deployment

QuantumComm Workbench is a static-first Next.js App Router project with server routes for local simulation and mock API exercises. Deployments must preserve the demo-only posture: no real secret-key material, no production cryptographic claims, and no telemetry or credentials without explicit consent.

## Baseline environment

- Node.js 22.x
- `npm ci`
- Next.js production build from `npm run build`

## Pre-deploy checks

Run the same gates used in CI:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Deployment notes

- The app does not require a database for the current MVP.
- Browser-local saved runs and scenario libraries remain client-side only and do not need server persistence.
- API routes are mock/simulation endpoints and should be labeled as educational or demo services in any hosting environment.
- Review [`docs/MODEL_LIMITATIONS.md`](/C:/Users/maguracs/source/quantumcomm_workbench/docs/MODEL_LIMITATIONS.md) and [`docs/VISUAL_QA.md`](/C:/Users/maguracs/source/quantumcomm_workbench/docs/VISUAL_QA.md) before promoting a release.

## Recommended release flow

1. Merge only after the CI workflow passes on the target branch.
2. Run the manual responsive checks in `docs/VISUAL_QA.md` for layout-impacting changes.
3. Confirm mock API examples and export formats still match their checked-in contracts and docs.
4. Publish with a deployment target that supports Next.js App Router server routes.
