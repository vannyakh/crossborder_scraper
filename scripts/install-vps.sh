#!/usr/bin/env bash
# VPS one-liner — installs under /www/wwwroot/crossborder_scraper
#
#   curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install-vps.sh | sudo bash
#
# Or with custom site name:
#   sudo CROSSBORDER_SITE_NAME=my_scraper bash install-vps.sh
#
set -euo pipefail
export CROSSBORDER_VPS=1
export CROSSBORDER_WWWROOT=1
export CROSSBORDER_OPEN_FIREWALL=1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${SCRIPT_DIR}/install.sh"
