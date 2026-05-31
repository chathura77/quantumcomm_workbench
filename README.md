# QuantumComm Workbench

QuantumComm Workbench is a Next.js + TypeScript MVP for quantum communication learning, engineering estimates, mock QKD integration, and quantum-network scenario exploration.

The app is intentionally cautious: outputs are educational and research-oriented estimates, not certified security guarantees or production cryptographic validation.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production run path

For a public VM, build and run the production server rather than the development server:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run start -- --hostname 0.0.0.0 --port 3000
```

Terminate TLS at a reverse proxy such as Caddy, Nginx, or a cloud load balancer, and expose only ports 80/443 publicly. The app sets browser security headers and API no-store headers, but the mock QKD API remains educational demo infrastructure and must not be wired to production secrets. See `docs/SECURITY_HARDENING.md` for the current hardening posture and residual risks.

To deploy under a path on `sarathchandra.com`, build with a base path:

```bash
QUANTUMCOMM_BASE_PATH=/quantumworkbench npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

If you deploy it on a true subdomain such as `quantumworkbench.sarathchandra.com`, leave `QUANTUMCOMM_BASE_PATH` unset.

## Hostinger VPS deployment and updates

The recommended VPS setup is Git + Node.js LTS + systemd + Nginx. This keeps the app maintainable: push changes to GitHub, SSH into the VPS, pull, build, restart, and health-check with one script.

First deployment on the VPS:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates nginx
git clone https://github.com/chathura77/quantumcomm_workbench.git /var/www/quantumcomm_workbench
cd /var/www/quantumcomm_workbench
QUANTUMCOMM_BASE_PATH=/quantumworkbench \
NEXT_PUBLIC_SITE_URL=https://www.sarathchandra.com/quantumworkbench \
bash scripts/hostinger-deploy.sh
```

Future update after new commits are pushed:

```bash
ssh deploy@YOUR_VPS_IP
cd /var/www/quantumcomm_workbench
bash scripts/hostinger-deploy.sh
```

GitHub Actions can also deploy to Hostinger after CI passes. Configure the secrets in `docs/GITHUB_ACTIONS_DEPLOYMENT.md`, then run `Deploy Hostinger VPS` manually or set `HOSTINGER_AUTO_DEPLOY=true` for automatic main-branch releases.

For Nginx, use `ops/hostinger/nginx-subpath-location.conf` inside the existing `sarathchandra.com` server block, or `ops/hostinger/nginx-subdomain-site.conf` for a dedicated `quantumworkbench.sarathchandra.com` site. Full steps are in `docs/HOSTINGER_VPS_DEPLOYMENT.md`.

## SEO and AI-readable indexes

The app emits sitemap, robots, JSON-LD, `llms.txt`, `llms-full.txt`, and `ai-summary.json` surfaces for search crawlers and AI assistants. See `docs/SEO_AI_READINESS.md` for canonical URL configuration and crawler notes.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

For responsive/manual UI review after layout or shared-component changes, use `docs/VISUAL_QA.md`.

## Implemented MVP areas

- Learn pages for BB84, E91, BBM92, decoy-state BB84, MDI-QKD, TF-QKD, CV-QKD, teleportation, entanglement swapping, and quantum repeaters.
- QKD engineering tools: link budget, finite-key BB84 teaching estimator, QBER forensics, post-processing, attack explorer, phase encoding, channel planner, paper extractor, and report generator.
- Standards and integration tools: ETSI-style mock QKD API sandbox, KMS simulator, standards conformance checker, and hybrid PQC + QKD decision tool.
- Network tools: scenario builder, entanglement routing, repeater optimizer, and benchmark hub with concrete simulator-mapping exports for external simulators.
- API routes under `/api/simulations/*`, `/api/qkd-mock/*`, and `/api/export/report`.

## Key files

- Pure kernels: `lib/qkd`, `lib/kms`, `lib/network`, `lib/standards`.
- Validation: `lib/validation/schemas.ts`.
- API hardening helpers: `lib/security`.
- UI routes: `app/`.
- Seed fixtures: `fixtures/`.
- Contracts and docs: `contracts/`, `docs/`.

## Model limitations

Read `docs/MODEL_LIMITATIONS.md` before interpreting results. The MVP favors transparent formulas and reproducible exports over research-grade physical modeling.
