#!/usr/bin/env bash
# Vite dev server for apps/web — API proxy auto-detects a live /health port (8000, .env PANEL_PORT, 8787).
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

if [[ -f "${ROOT}/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "${ROOT}/.env"
  set +a
fi

need_pnpm
cd "${ROOT}/apps/web"
[[ -d node_modules ]] || pnpm install

PORT="${PANEL_PORT:-8787}"
if ! curl -sf --max-time 1 "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
  echo "⚠  API not running on port ${PORT} — start it in another terminal:" >&2
  echo "   bash scripts/serve-api.sh" >&2
  echo "   (UI will load but /health and panel data will 502 until API is up)" >&2
  echo "" >&2
fi

exec pnpm dev
