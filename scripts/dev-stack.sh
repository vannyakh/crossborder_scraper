#!/usr/bin/env bash
# Print how to run API + UI dev servers (two terminals).
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

PORT="${PANEL_PORT:-8000}"
cat <<EOF
Crossborder scraper — local dev stack

Terminal 1 (API):
  bash scripts/serve-api.sh
  → http://127.0.0.1:${PORT}/ui/   (after: cd apps/web && pnpm build)

Terminal 2 (UI hot reload):
  bash scripts/dev-ui.sh
  → http://127.0.0.1:5173/ui/

CLI:
  uv run scraper gateway
  uv run scraper skills list --local
  uv run scraper agent "list last 5 products" --local

EOF
