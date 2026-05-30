#!/usr/bin/env bash
# Optional wwwroot wrapper — most VPS installs use the main one-liner instead:
#   curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
#
# This script forces /www/wwwroot layout + security entrance (run as root):
#   curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install-vps.sh | sudo bash
#
# With nginx on port 80:
#   curl -fsSL .../install-vps.sh | sudo env CROSSBORDER_NGINX=1 bash
#
# Docs: docs/INSTALL.md
set -eo pipefail

export CROSSBORDER_VPS=1
export CROSSBORDER_WWWROOT=1
export CROSSBORDER_OPEN_FIREWALL=1

INSTALL_SCRIPT_URL="${CROSSBORDER_INSTALL_SCRIPT_URL:-https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh}"

_self="${BASH_SOURCE[0]:-${0:-}}"
if [[ -n "${_self}" && "${_self}" != "-" && -f "${_self}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${_self}")" && pwd)"
  exec bash "${SCRIPT_DIR}/install.sh"
fi

# Piped from curl (no file on disk): run the main installer from GitHub.
curl -fsSL "${INSTALL_SCRIPT_URL}" | exec bash -s
