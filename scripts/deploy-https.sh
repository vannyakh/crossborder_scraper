#!/usr/bin/env bash
# Production HTTPS — nginx reverse proxy + Let's Encrypt (run on the VPS as root).
#
#   sudo bash scripts/deploy-https.sh panel.yourdomain.com
#
# Prerequisites:
#   • DNS A record → this server's public IP
#   • Cloud security group: inbound TCP 80 and 443
#   • Cross-Border panel running on 127.0.0.1:8787 (default install)

set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "${DOMAIN}" || "${DOMAIN}" == "-h" || "${DOMAIN}" == "--help" ]]; then
  cat <<'EOF'
Usage: sudo bash scripts/deploy-https.sh <domain> [-- extra crossborder flags]

Example:
  sudo bash scripts/deploy-https.sh panel.example.com

After success, open: https://panel.example.com/ui/login
EOF
  exit "${DOMAIN:+0}"
fi
shift || true

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/deploy-https.sh ${DOMAIN}" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ ! -x "${ROOT}/.venv/bin/crossborder" ]]; then
  echo "Cross-Border install not found at ${ROOT}" >&2
  exit 1
fi

export PYTHONPATH="${ROOT}/src"
exec "${ROOT}/.venv/bin/crossborder" deploy https -n "${DOMAIN}" "$@"
