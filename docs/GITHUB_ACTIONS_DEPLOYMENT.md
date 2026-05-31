# GitHub Actions Deployment

QuantumComm Workbench uses GitHub Actions for repeatable quality checks and optional Hostinger VPS deployment.

## Workflows

- `CI` runs on pull requests and pushes to `main` or `master`.
- `Dependency Audit` runs weekly and on demand.
- `Deploy Hostinger VPS` can be run manually, and can also deploy automatically after `CI` passes on a push to `main`.

The deploy workflow uses the runner's OpenSSH client directly instead of a third-party SSH action. It pins the VPS host key through a GitHub secret and runs `scripts/hostinger-deploy.sh` on the VPS.

## Required GitHub Secrets

Create these in GitHub under `Settings` -> `Secrets and variables` -> `Actions`.

| Secret | Purpose |
| --- | --- |
| `HOSTINGER_VPS_HOST` | VPS hostname or IP address. |
| `HOSTINGER_VPS_USER` | Non-root deployment user, for example `deploy`. |
| `HOSTINGER_VPS_SSH_KEY` | Private SSH key that can log in as the deployment user. |
| `HOSTINGER_SSH_KNOWN_HOSTS` | Pinned SSH host key line for the VPS. |
| `HOSTINGER_VPS_SSH_PORT` | Optional SSH port. Defaults to `22` when omitted. |

Generate the known-hosts value from a trusted machine:

```bash
ssh-keyscan -H YOUR_VPS_HOST
```

Verify the printed fingerprint against the VPS console or Hostinger's SSH details before saving it as a secret.

## SSH Key Setup

The `HOSTINGER_VPS_SSH_KEY` secret must contain a private key in OpenSSH format. The value should start with:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
```

and end with:

```text
-----END OPENSSH PRIVATE KEY-----
```

Do not paste the `.pub` file, a PuTTY `.ppk` file, a screenshot, or a one-line value with literal `\n` characters.

Generate a dedicated deploy key on your local machine:

```bash
ssh-keygen -t ed25519 -C "quantumcomm GitHub Actions deploy" -f ./quantumcomm_hostinger_actions_ed25519 -N ""
```

Install the public key on the VPS:

```bash
ssh-copy-id -i ./quantumcomm_hostinger_actions_ed25519.pub deploy@quantum-workbench.sarathchandra.com
```

If `ssh-copy-id` is unavailable, append the public key manually:

```bash
cat ./quantumcomm_hostinger_actions_ed25519.pub | ssh deploy@quantum-workbench.sarathchandra.com 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
```

Test the key before adding it to GitHub:

```bash
ssh -i ./quantumcomm_hostinger_actions_ed25519 deploy@quantum-workbench.sarathchandra.com 'hostname && sudo -n true'
```

Copy the private key into the GitHub secret exactly as a multi-line value:

```bash
cat ./quantumcomm_hostinger_actions_ed25519
```

On Windows PowerShell:

```powershell
Get-Content -Raw .\quantumcomm_hostinger_actions_ed25519 | Set-Clipboard
```

Then paste the clipboard into `HOSTINGER_VPS_SSH_KEY`.

## Optional GitHub Variables

Create these under `Settings` -> `Secrets and variables` -> `Actions` -> `Variables` when you need to override defaults.

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOSTINGER_AUTO_DEPLOY` | unset | Set to `true` to deploy automatically after `CI` passes on `main`. Leave unset for manual-only deployment. |
| `HOSTINGER_APP_DIR` | `/var/www/quantumcomm_workbench` | Repository checkout directory on the VPS. |
| `HOSTINGER_BASE_PATH` | `__root__` | Next.js base path. Use `__root__` for `quantum-workbench.sarathchandra.com`; use `/quantumworkbench` only for the old path deployment. |
| `HOSTINGER_SITE_URL` | `https://quantum-workbench.sarathchandra.com` | Canonical public site URL. |
| `HOSTINGER_PUBLIC_HEALTH_URL` | `https://quantum-workbench.sarathchandra.com/` | Public URL checked after deployment. |

## First-Time Setup

1. Prepare the VPS using `docs/HOSTINGER_VPS_DEPLOYMENT.md`.
2. Confirm the deployment user can run the script manually:

```bash
cd /var/www/quantumcomm_workbench
bash scripts/hostinger-deploy.sh
```

3. Confirm the deployment user can run deployment `sudo` commands non-interactively:

```bash
sudo -n true
```

If this fails, configure a dedicated deploy user with tightly scoped passwordless sudo for the commands used by `scripts/hostinger-deploy.sh`, then re-test before enabling Actions deployment.

4. Add the GitHub secrets and variables above.
5. Open `Actions` -> `Deploy Hostinger VPS` -> `Run workflow`.

## Normal Update Flow

1. Push to `main`.
2. The `CI` workflow runs lint, typecheck, tests, smoke tests, and the Hostinger path build.
3. If `HOSTINGER_AUTO_DEPLOY=true`, the deploy workflow starts after CI succeeds.
4. The runner connects to the VPS, pulls the target branch, rebuilds, restarts the systemd service, and checks the public URL.

For manual releases, leave `HOSTINGER_AUTO_DEPLOY` unset and run `Deploy Hostinger VPS` from the Actions tab when ready.
