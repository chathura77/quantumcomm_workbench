# Hostinger VPS Deployment

This guide deploys QuantumComm Workbench on a Hostinger VPS as a normal Linux service that can be updated from Git.

## Recommended Architecture

Use a standard Ubuntu VPS with:

- Git checkout of this repository.
- Node.js LTS and npm.
- `systemd` to keep the Next.js production server running.
- Nginx in front for HTTPS, path routing, request limits, and logs.
- Hostinger VPS Firewall plus Ubuntu UFW so only SSH, HTTP, and HTTPS are exposed.

This is intentionally boring infrastructure. It keeps updates simple: pull from GitHub, run one deployment script, and let systemd restart the app.

## New VPS From Scratch

Use this checklist for a fresh Hostinger VPS and a GoDaddy-managed domain. The examples use `quantum-workbench.sarathchandra.com`; replace that hostname consistently if you choose `qworkbench.sarathchandra.com` or another subdomain.

### 1. Add DNS

In GoDaddy DNS, add a new A record:

```text
Type: A
Name: quantum-workbench
Value: YOUR_HOSTINGER_VPS_IP
TTL: 600 seconds
```

Do not edit the existing `www` CNAME that points to Ghost. DNS cannot route only `/quantumworkbench` to a different VPS while `www` is owned by Ghost, so the clean deployment is a dedicated subdomain.

After saving the record, check propagation:

```bash
nslookup quantum-workbench.sarathchandra.com
```

### 2. Create a Deployment User

Connect as root, update the server, and create a non-root operator account:

```bash
ssh root@YOUR_HOSTINGER_VPS_IP
apt update && apt upgrade -y
adduser deploy
usermod -aG sudo deploy
```

Log back in as that user:

```bash
ssh deploy@YOUR_HOSTINGER_VPS_IP
```

### 3. Install Server Packages

```bash
sudo apt update
sudo apt install -y git curl ca-certificates nginx ufw certbot python3-certbot-nginx
```

Install Node.js 22 from your preferred trusted package source, then verify:

```bash
node --version
npm --version
```

### 4. Clone the App

```bash
sudo mkdir -p /var/www
sudo chown "$USER":"$USER" /var/www
git clone https://github.com/chathura77/quantumcomm_workbench.git /var/www/quantumcomm_workbench
cd /var/www/quantumcomm_workbench
```

### 5. Run the First Deployment

For a subdomain/root deployment:

```bash
QUANTUMCOMM_BASE_PATH= \
NEXT_PUBLIC_SITE_URL=https://quantum-workbench.sarathchandra.com \
bash scripts/hostinger-deploy.sh
```

### 6. Configure Nginx

```bash
sudo cp ops/hostinger/nginx-subdomain-site.conf /etc/nginx/sites-available/quantumcomm-workbench
sudo ln -sf /etc/nginx/sites-available/quantumcomm-workbench /etc/nginx/sites-enabled/quantumcomm-workbench
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Configure Firewall and TLS

Use Hostinger VPS Firewall in hPanel as the outer layer, and UFW on the VPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status verbose
```

Issue the HTTPS certificate after DNS resolves to the VPS:

```bash
curl -I http://quantum-workbench.sarathchandra.com/
sudo certbot --nginx -d quantum-workbench.sarathchandra.com
sudo certbot renew --dry-run
```

The HTTP check should return `200` before running Certbot. If Certbot reports that an existing certificate already matches the domain, choose option `1` to reinstall the existing certificate unless you intentionally need a fresh renewal. Avoid option `2` unless needed because repeated renewals can hit certificate authority rate limits.

### 8. Verify Production

```bash
sudo systemctl status quantumcomm-workbench
curl -I http://127.0.0.1:3000/
curl -I http://quantum-workbench.sarathchandra.com/
curl -I https://quantum-workbench.sarathchandra.com/
```

### 9. Enable GitHub Actions Deployment

Confirm the deployment user can run the deployment script and non-interactive sudo:

```bash
cd /var/www/quantumcomm_workbench
bash scripts/hostinger-deploy.sh
sudo -n true
```

If `sudo -n true` fails, configure tightly scoped passwordless sudo for the deployment commands before enabling Actions.

Add GitHub Actions secrets:

```text
HOSTINGER_VPS_HOST=quantum-workbench.sarathchandra.com
HOSTINGER_VPS_USER=deploy
HOSTINGER_VPS_SSH_KEY=<full unencrypted OpenSSH private key for the deploy user>
HOSTINGER_SSH_KNOWN_HOSTS=<output of ssh-keyscan -H quantum-workbench.sarathchandra.com>
```

The SSH key secret must be the full multi-line private key block, not the `.pub` file or a PuTTY `.ppk` file. See `docs/GITHUB_ACTIONS_DEPLOYMENT.md` for exact key-generation and copy commands.

Add GitHub Actions variables:

```text
HOSTINGER_APP_DIR=/var/www/quantumcomm_workbench
HOSTINGER_BASE_PATH=__root__
HOSTINGER_SITE_URL=https://quantum-workbench.sarathchandra.com
HOSTINGER_PUBLIC_HEALTH_URL=https://quantum-workbench.sarathchandra.com/
```

Start with manual deploys from `Actions` -> `Deploy Hostinger VPS`. Set `HOSTINGER_AUTO_DEPLOY=true` only when you want every successful `main` branch CI run to deploy automatically.

### 10. Normal Updates

Manual VPS update:

```bash
ssh deploy@YOUR_HOSTINGER_VPS_IP
cd /var/www/quantumcomm_workbench
bash scripts/hostinger-deploy.sh
```

GitHub Actions update:

```text
Push to main -> CI passes -> Deploy Hostinger VPS workflow runs
```

Use the manual SSH flow for first setup, Nginx/TLS/DNS changes, rollback, or debugging a failed workflow.

## Domain Choice

For `https://www.sarathchandra.com/quantumworkbench`:

- Build with `QUANTUMCOMM_BASE_PATH=/quantumworkbench`.
- Set `NEXT_PUBLIC_SITE_URL=https://www.sarathchandra.com/quantumworkbench`.
- Paste `ops/hostinger/nginx-subpath-location.conf` into the existing `sarathchandra.com` HTTPS server block.

For `https://quantum-workbench.sarathchandra.com`:

- Leave `QUANTUMCOMM_BASE_PATH` empty.
- Set `NEXT_PUBLIC_SITE_URL=https://quantum-workbench.sarathchandra.com`.
- Use `ops/hostinger/nginx-subdomain-site.conf` as a new Nginx site.

The path deployment is useful when the app should feel like part of the existing site. The subdomain deployment is operationally cleaner if the main website is already managed elsewhere.

## First-Time VPS Setup

Connect to the VPS and create a normal sudo user if you do not already have one:

```bash
ssh root@YOUR_VPS_IP
adduser deploy
usermod -aG sudo deploy
```

Log back in as that user:

```bash
ssh deploy@YOUR_VPS_IP
```

Install baseline packages:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl ca-certificates nginx
```

Install Node.js LTS using your preferred trusted source. Confirm the installed version:

```bash
node --version
npm --version
```

Clone the app:

```bash
sudo mkdir -p /var/www
sudo chown "$USER":"$USER" /var/www
git clone https://github.com/chathura77/quantumcomm_workbench.git /var/www/quantumcomm_workbench
cd /var/www/quantumcomm_workbench
```

Run the deployment script for the live subdomain deployment:

```bash
QUANTUMCOMM_BASE_PATH= \
NEXT_PUBLIC_SITE_URL=https://quantum-workbench.sarathchandra.com \
bash scripts/hostinger-deploy.sh
```

Or run it for the old path deployment:

```bash
QUANTUMCOMM_BASE_PATH=/quantumworkbench \
NEXT_PUBLIC_SITE_URL=https://www.sarathchandra.com/quantumworkbench \
bash scripts/hostinger-deploy.sh
```

The script:

1. Pulls the configured branch from GitHub.
2. Writes `/etc/quantumcomm-workbench.env`.
3. Runs `npm ci`, lint, typecheck, and tests.
4. Builds the Next.js app with the right canonical URL/base path.
5. Installs and restarts a `quantumcomm-workbench.service` systemd service.
6. Runs a local HTTP health check.

## GitHub Actions Deployment

After the manual script works, GitHub Actions can run the same deployment remotely over SSH. Configure the secrets and variables in `docs/GITHUB_ACTIONS_DEPLOYMENT.md`, then run `Deploy Hostinger VPS` from the Actions tab.

Leave `HOSTINGER_AUTO_DEPLOY` unset for manual releases. Set it to `true` only when you want every successful `main` branch CI run to deploy automatically.

## Nginx

### Path Deployment

If the existing `sarathchandra.com` site is already served by Nginx on this VPS, do not create a second `server_name sarathchandra.com` block. Add the contents of:

```text
ops/hostinger/nginx-subpath-location.conf
```

inside the existing HTTPS server block, then reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

If the existing site is not on this VPS, configure the domain or reverse proxy so `/quantumworkbench/` is forwarded to this VPS.

### Subdomain Deployment

Copy the template:

```bash
sudo cp ops/hostinger/nginx-subdomain-site.conf /etc/nginx/sites-available/quantumcomm-workbench
sudo ln -s /etc/nginx/sites-available/quantumcomm-workbench /etc/nginx/sites-enabled/quantumcomm-workbench
sudo nginx -t
sudo systemctl reload nginx
```

Create an A record for `quantum-workbench.sarathchandra.com` pointing to the VPS IP.

## TLS

After DNS resolves to the VPS, install Certbot and issue a certificate:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d quantum-workbench.sarathchandra.com
```

For the path deployment, TLS is normally handled by the existing `sarathchandra.com` site certificate.

## Firewall

Use Hostinger VPS Firewall in hPanel and the OS firewall. Keep only required ports public:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status verbose
```

Keep the Next.js service bound to `127.0.0.1:3000`; do not expose port `3000` publicly.

## Updating Later

After new commits are pushed to GitHub:

```bash
ssh deploy@YOUR_VPS_IP
cd /var/www/quantumcomm_workbench
bash scripts/hostinger-deploy.sh
```

Or trigger `Deploy Hostinger VPS` from GitHub Actions once the CI workflow is green.

To skip tests during an urgent hotfix deployment:

```bash
RUN_CHECKS=0 bash scripts/hostinger-deploy.sh
```

Use that sparingly. The normal update path should run checks before restarting the service.

## Operations Commands

```bash
sudo systemctl status quantumcomm-workbench
sudo journalctl -u quantumcomm-workbench -f
sudo systemctl restart quantumcomm-workbench
curl -I http://127.0.0.1:3000/
curl -I http://quantum-workbench.sarathchandra.com/
curl -I https://quantum-workbench.sarathchandra.com/
```

For the old path deployment, replace `/` with `/quantumworkbench/` and check `https://www.sarathchandra.com/quantumworkbench/`.

## Rollback

List recent commits and redeploy a known-good one:

```bash
cd /var/www/quantumcomm_workbench
git log --oneline -5
git checkout COMMIT_SHA
PULL_LATEST=0 bash scripts/hostinger-deploy.sh
```

Return to `main` later:

```bash
git checkout main
bash scripts/hostinger-deploy.sh
```
