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

## Domain Choice

For `https://www.sarathchandra.com/quantumworkbench`:

- Build with `QUANTUMCOMM_BASE_PATH=/quantumworkbench`.
- Set `NEXT_PUBLIC_SITE_URL=https://www.sarathchandra.com/quantumworkbench`.
- Paste `ops/hostinger/nginx-subpath-location.conf` into the existing `sarathchandra.com` HTTPS server block.

For `https://quantumworkbench.sarathchandra.com`:

- Leave `QUANTUMCOMM_BASE_PATH` empty.
- Set `NEXT_PUBLIC_SITE_URL=https://quantumworkbench.sarathchandra.com`.
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

Run the deployment script for the path deployment:

```bash
QUANTUMCOMM_BASE_PATH=/quantumworkbench \
NEXT_PUBLIC_SITE_URL=https://www.sarathchandra.com/quantumworkbench \
bash scripts/hostinger-deploy.sh
```

Or run it for a true subdomain:

```bash
QUANTUMCOMM_BASE_PATH= \
NEXT_PUBLIC_SITE_URL=https://quantumworkbench.sarathchandra.com \
bash scripts/hostinger-deploy.sh
```

The script:

1. Pulls the configured branch from GitHub.
2. Writes `/etc/quantumcomm-workbench.env`.
3. Runs `npm ci`, lint, typecheck, and tests.
4. Builds the Next.js app with the right canonical URL/base path.
5. Installs and restarts a `quantumcomm-workbench.service` systemd service.
6. Runs a local HTTP health check.

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

Create an A record for `quantumworkbench.sarathchandra.com` pointing to the VPS IP.

## TLS

After DNS resolves to the VPS, install Certbot and issue a certificate:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d quantumworkbench.sarathchandra.com
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
curl -I http://127.0.0.1:3000/quantumworkbench/
curl -I https://www.sarathchandra.com/quantumworkbench/
```

For a subdomain deployment, replace `/quantumworkbench/` with `/`.

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
