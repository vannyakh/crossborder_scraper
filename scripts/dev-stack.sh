#!/usr/bin/env bash
# Print how to run API + UI dev servers (two terminals).
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

load_dotenv
PORT="$(panel_port)"
cat <<EOF
Cross-Border — local dev stack

Development (hot reload):
  Terminal 1:  make run-dev      # API + reload; proxies to Vite when dist/ missing
  Terminal 2:  make run-dev-ui   # Vite → http://127.0.0.1:5173/ui/

Production-like (local):
  make build-prod                # apps/web/dist/
  make run-prod                  # API serves static bundle (no reload)
  make test-prod                 # build + /health + /ui/ smoke
  make test-prod-docker          # docker build + container health

Tests:
  make test-dev                  # pytest + import smoke (daily dev)
  make check-ci                  # ruff + test-dev (GitHub CI Python job)

URLs (dev):
  API:  http://127.0.0.1:${PORT}/ui/
  Vite: http://127.0.0.1:5173/ui/

Debug (VS Code / Cursor):
  Run and Debug → "API: uvicorn (reload)" or "Test: pytest (current file)"

CLI:
  uv run crossborder gateway
  uv run crossborder skills list --local

EOF
