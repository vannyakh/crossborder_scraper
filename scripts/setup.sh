#!/usr/bin/env bash
# First-time / CI setup: deps, browser, panel credentials.
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

echo "==> sync Python dependencies"
if command -v uv >/dev/null 2>&1; then
  uv sync
else
  pip install -e .
fi

echo "==> install Playwright Chromium"
repo_python -m playwright install chromium

MODE="${SETUP_MODE:-server}"
echo "==> bootstrap (mode=$MODE)"
if [[ "$MODE" == "panel" ]]; then
  repo_scraper setup
else
  repo_scraper setup "--${MODE}"
fi

echo ""
echo "Done. Self-host options:"
echo "  bash scripts/serve-api.sh       # dev API + reload"
echo "  uv run scraper deploy up          # Docker production"
echo "  uv run scraper deploy systemd     # Linux service unit"
echo "  bash scripts/dev-ui.sh            # frontend dev"
