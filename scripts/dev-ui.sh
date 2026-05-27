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
exec pnpm dev
