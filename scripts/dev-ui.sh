#!/usr/bin/env bash
# Vite dev server for apps/web (API proxy → localhost:8000).
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

need_pnpm
cd "${ROOT}/apps/web"
[[ -d node_modules ]] || pnpm install
exec pnpm dev
