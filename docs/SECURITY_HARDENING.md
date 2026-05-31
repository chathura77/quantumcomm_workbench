# Security Hardening Notes

This document summarizes the current MVP hardening posture for public-facing deployments. QuantumComm Workbench remains an educational and research-estimation application, not a certified cryptographic security product.

## Implemented controls

- Production builds now fail on TypeScript errors through the normal Next.js build path.
- Site-wide headers include CSP, frame denial, MIME sniffing protection, referrer policy, permissions policy, and cross-origin isolation helpers.
- API JSON responses include `Cache-Control: no-store, max-age=0` and `X-Content-Type-Options: nosniff`.
- API POST handlers share guarded JSON parsing with content-type checks, malformed JSON handling, declared and measured body-size checks, and friendly error responses.
- Public API routes use in-memory per-route rate limits to reduce accidental abuse and low-effort flooding.
- KMS simulations cap duration, service count, numeric magnitudes, and total time steps to avoid runaway CPU/memory work.
- Network scenario inputs cap node/link counts and identifier lengths before graph traversal.
- Report exports cap title, assumptions, warnings, references, formulas, and request body size.
- Mock QKD key IDs and demo key material include random tokens, and demo token comparison uses constant-time comparison.
- Dev dependency audit is clean after upgrading Vitest.

## Deployment requirements

- Run `npm run build` and `npm run start`; never expose `npm run dev` publicly.
- Terminate TLS at a reverse proxy or load balancer and expose only ports 80/443.
- Configure reverse-proxy request-size limits, access logs, and external rate limiting. The in-app limiter is process-local and resets on restart.
- Treat the ETSI-style QKD API as a sandbox only. Do not connect it to real key managers, HSMs, VPNs, or production encryption systems.

## Residual risks

- CSP keeps `unsafe-inline` for scripts and styles because the current Next.js app output needs inline runtime/style support. Future nonce-based CSP work can tighten this further.
- The rate limiter is in-memory and best-effort. Multi-instance deployments need proxy, load-balancer, or shared-store rate limiting.
- Demo application tokens are intentionally documented for sandbox use and are not credentials.
- This pass did not include penetration testing, DAST, fuzzing, or a formally authorized multi-agent Codex Security scan.
