# QuantumComm Workbench

QuantumComm Workbench is a Next.js + TypeScript MVP for quantum communication learning, engineering estimates, mock QKD integration, and quantum-network scenario exploration.

The app is intentionally cautious: outputs are educational and research-oriented estimates, not certified security guarantees or production cryptographic validation.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deployment, Updates, and Maintenance

Use the production server for public hosting. Never expose `npm run dev` on a public interface.

### Pre-deploy checks

Run these before merging or deploying manually:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

To start a production server directly:

```bash
npm run start -- --hostname 127.0.0.1 --port 3000
```

Terminate TLS at Nginx, Caddy, or a load balancer, and expose only ports 80/443 publicly. Bind the Next.js service to `127.0.0.1:3000` when a local reverse proxy forwards traffic. The app sets browser security headers and API no-store headers, but the mock QKD API remains educational demo infrastructure and must not be wired to production secrets.

### Domain mode

To deploy under a path on `sarathchandra.com`, build with a base path:

```bash
QUANTUMCOMM_BASE_PATH=/quantumworkbench npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

If you deploy it on a true subdomain such as `quantumworkbench.sarathchandra.com`, leave `QUANTUMCOMM_BASE_PATH` unset.

### Hostinger VPS first deployment

The recommended VPS setup is Git + Node.js LTS + systemd + Nginx. This keeps the app maintainable: push changes to GitHub, SSH into the VPS, pull, build, restart, and health-check with one script.

On the VPS:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates nginx
git clone https://github.com/chathura77/quantumcomm_workbench.git /var/www/quantumcomm_workbench
cd /var/www/quantumcomm_workbench
QUANTUMCOMM_BASE_PATH=/quantumworkbench \
NEXT_PUBLIC_SITE_URL=https://www.sarathchandra.com/quantumworkbench \
bash scripts/hostinger-deploy.sh
```

For Nginx, use `ops/hostinger/nginx-subpath-location.conf` inside the existing `sarathchandra.com` server block, or `ops/hostinger/nginx-subdomain-site.conf` for a dedicated `quantumworkbench.sarathchandra.com` site. Full VPS steps are in `docs/HOSTINGER_VPS_DEPLOYMENT.md`.

For a brand-new VPS, DNS, TLS, firewall, and GitHub Actions setup from scratch, use the `New VPS From Scratch` checklist in `docs/HOSTINGER_VPS_DEPLOYMENT.md`.

### GitHub Actions deployment

GitHub Actions can deploy to Hostinger after CI passes. Add these repository secrets:

```text
HOSTINGER_VPS_HOST
HOSTINGER_VPS_USER
HOSTINGER_VPS_SSH_KEY
HOSTINGER_SSH_KNOWN_HOSTS
```

`HOSTINGER_VPS_SSH_PORT` is optional and defaults to `22`.

Then run `Deploy Hostinger VPS` from the GitHub Actions tab. Leave `HOSTINGER_AUTO_DEPLOY` unset for manual releases, or set it to `true` as an Actions variable to deploy automatically after `CI` passes on `main`.

Useful optional Actions variables:

```text
HOSTINGER_APP_DIR=/var/www/quantumcomm_workbench
HOSTINGER_BASE_PATH=/quantumworkbench
HOSTINGER_SITE_URL=https://www.sarathchandra.com/quantumworkbench
HOSTINGER_PUBLIC_HEALTH_URL=https://www.sarathchandra.com/quantumworkbench/
```

For a true subdomain deployment, set `HOSTINGER_BASE_PATH=__root__`. Full Actions setup is in `docs/GITHUB_ACTIONS_DEPLOYMENT.md`.

### Manual update flow

After new commits are pushed:

```bash
ssh deploy@YOUR_VPS_IP
cd /var/www/quantumcomm_workbench
bash scripts/hostinger-deploy.sh
```

The script pulls the latest `main`, installs from `package-lock.json`, runs checks, builds, restarts `quantumcomm-workbench.service`, and performs a local health check.

Use this only for urgent hotfixes:

```bash
RUN_CHECKS=0 bash scripts/hostinger-deploy.sh
```

### Maintenance commands

On the VPS:

```bash
sudo systemctl status quantumcomm-workbench
sudo journalctl -u quantumcomm-workbench -f
sudo systemctl restart quantumcomm-workbench
curl -I http://127.0.0.1:3000/quantumworkbench/
curl -I https://www.sarathchandra.com/quantumworkbench/
sudo nginx -t
sudo systemctl reload nginx
npm audit --audit-level=high
```

For rollback:

```bash
cd /var/www/quantumcomm_workbench
git log --oneline -5
git checkout COMMIT_SHA
PULL_LATEST=0 bash scripts/hostinger-deploy.sh
git checkout main
bash scripts/hostinger-deploy.sh
```

Keep `docs/SECURITY_HARDENING.md`, `docs/MODEL_LIMITATIONS.md`, `docs/VISUAL_QA.md`, `docs/HOSTINGER_VPS_DEPLOYMENT.md`, and `docs/GITHUB_ACTIONS_DEPLOYMENT.md` with release notes so operators can see the current risk and deployment posture.

## SEO and AI-readable indexes

The app emits sitemap, robots, JSON-LD, `llms.txt`, `llms-full.txt`, and `ai-summary.json` surfaces for search crawlers and AI assistants. See `docs/SEO_AI_READINESS.md` for canonical URL configuration and crawler notes.

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
