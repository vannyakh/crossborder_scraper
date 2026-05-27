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

echo "==> panel credentials (.env)"
repo_scraper setup

echo ""
echo "Done. Next:"
echo "  bash scripts/serve-api.sh    # API + built UI at /ui/"
echo "  bash scripts/dev-ui.sh       # frontend dev (separate terminal)"
