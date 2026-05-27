#!/usr/bin/env bash
# VPS one-liner — installs under /www/wwwroot/crossborder_scraper
#
#   curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install-vps.sh | sudo bash
#
# Or from a cloned repo:
#   sudo CROSSBORDER_SITE_NAME=my_scraper bash scripts/install-vps.sh
#
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
