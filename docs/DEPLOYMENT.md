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
npm run test:e2e
```

## Deployment notes

- The app does not require a database for the current MVP.
- Browser-local saved runs and scenario libraries remain client-side only and do not need server persistence.
- API routes are mock/simulation endpoints and should be labeled as educational or demo services in any hosting environment.
- Use `npm run start -- --hostname 0.0.0.0 --port 3000` or an equivalent process manager command after `npm run build`; do not expose `npm run dev` on a public interface.
- For `https://www.sarathchandra.com/quantumworkbench`, set `QUANTUMCOMM_BASE_PATH=/quantumworkbench` before `npm run build` and route that path prefix to the Next.js server. For a true subdomain such as `https://quantumworkbench.sarathchandra.com`, leave `QUANTUMCOMM_BASE_PATH` unset.
- Put the app behind HTTPS with a reverse proxy or load balancer. Allow public ingress only on 80/443, forward to the local Next.js port, and keep SSH restricted to trusted operators.
- Next.js emits a conservative Content Security Policy plus framing, MIME-sniffing, referrer, permissions, and cross-origin headers. Validate any future third-party script, image, analytics, or font addition against `next.config.mjs` before deployment.
- API routes use bounded JSON parsing, no-store JSON responses, and in-memory rate limiting. These limits reduce accidental or low-effort abuse but are not a substitute for VM-level firewalling, reverse-proxy request limits, or WAF/rate controls on an internet-facing service.
- The ETSI-style QKD API is a simulation sandbox. Its demo tokens and returned `keyMaterial` strings are not production credentials or secret-key delivery; do not connect the mock API to real KMS, HSM, or network encryption systems.
- Keep [`docs/SECURITY_HARDENING.md`](/C:/Users/maguracs/source/quantumcomm_workbench/docs/SECURITY_HARDENING.md) with the release notes so residual risks are visible to operators.
- Review [`docs/MODEL_LIMITATIONS.md`](/C:/Users/maguracs/source/quantumcomm_workbench/docs/MODEL_LIMITATIONS.md) and [`docs/VISUAL_QA.md`](/C:/Users/maguracs/source/quantumcomm_workbench/docs/VISUAL_QA.md) before promoting a release.

## Public VM checklist

1. Install Node.js 22.x from a trusted package source.
2. Create a non-root service user for the app checkout.
3. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
4. Start with a process manager such as systemd or PM2 using `npm run start -- --hostname 127.0.0.1 --port 3000` when a local reverse proxy is forwarding traffic, or `0.0.0.0` only when the VM network policy requires direct binding.
5. Configure HTTPS, request-size limits, access logs, and external rate limiting at the reverse proxy.
6. Confirm `/`, `/tools`, `/networks`, `/resources`, and `/api/qkd-mock/status` respond after deployment.

## Recommended release flow

1. Merge only after the CI workflow passes on the target branch.
2. Run the manual responsive checks in `docs/VISUAL_QA.md` for layout-impacting changes.
3. Confirm mock API examples and export formats still match their checked-in contracts and docs.
4. Publish with a deployment target that supports Next.js App Router server routes.
