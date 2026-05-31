#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-quantumcomm-workbench}"
SERVICE_NAME="${SERVICE_NAME:-quantumcomm-workbench}"
ENV_FILE="${ENV_FILE:-/etc/quantumcomm-workbench.env}"
BRANCH="${BRANCH:-main}"
APP_HOST="${APP_HOST:-127.0.0.1}"
PORT="${PORT:-3000}"
NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://quantum-workbench.sarathchandra.com}"
RUN_CHECKS="${RUN_CHECKS:-1}"
PULL_LATEST="${PULL_LATEST:-1}"

if [[ -z "${QUANTUMCOMM_BASE_PATH+x}" ]]; then
  QUANTUMCOMM_BASE_PATH=""
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "Could not locate package.json from ${APP_DIR}." >&2
  exit 1
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command git
require_command npm
require_command sudo
require_command curl

if [[ "${QUANTUMCOMM_BASE_PATH}" != "" ]]; then
  if [[ "${QUANTUMCOMM_BASE_PATH}" != /* || "${QUANTUMCOMM_BASE_PATH}" == */ ]]; then
    echo "QUANTUMCOMM_BASE_PATH must start with '/' and must not end with '/'. Example: /quantumworkbench" >&2
    exit 1
  fi
fi

cd "${APP_DIR}"

echo "Deploying ${APP_NAME} from ${APP_DIR}"
echo "Branch: ${BRANCH}"
echo "Public URL: ${NEXT_PUBLIC_SITE_URL}"
echo "Base path: ${QUANTUMCOMM_BASE_PATH:-/}"

if [[ "${PULL_LATEST}" == "1" ]]; then
  git fetch --prune origin
  git checkout "${BRANCH}"
  git pull --ff-only origin "${BRANCH}"
fi

sudo install -d -m 0755 "$(dirname "${ENV_FILE}")"
sudo tee "${ENV_FILE}" >/dev/null <<EOF
NODE_ENV=production
PORT=${PORT}
APP_HOST=${APP_HOST}
QUANTUMCOMM_BASE_PATH=${QUANTUMCOMM_BASE_PATH}
NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
EOF

npm ci

if [[ "${RUN_CHECKS}" == "1" ]]; then
  npm run lint
  npm run typecheck
  npm run test
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a
npm run build

sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" >/dev/null <<EOF
[Unit]
Description=QuantumComm Workbench Next.js service
Documentation=https://github.com/chathura77/quantumcomm_workbench
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/env npm run start -- --hostname \${APP_HOST} --port \${PORT}
Restart=always
RestartSec=5
KillSignal=SIGINT
TimeoutStopSec=30
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"

health_path="${QUANTUMCOMM_BASE_PATH:-}"
health_url="http://${APP_HOST}:${PORT}${health_path}/"
echo "Waiting for ${health_url}"
for attempt in {1..20}; do
  if curl -fsS "${health_url}" >/dev/null; then
    echo "Service is healthy: ${health_url}"
    sudo systemctl --no-pager --lines=12 status "${SERVICE_NAME}"
    exit 0
  fi
  sleep 2
done

echo "Service did not pass health check. Recent logs:" >&2
sudo journalctl -u "${SERVICE_NAME}" --no-pager -n 80 >&2
exit 1
