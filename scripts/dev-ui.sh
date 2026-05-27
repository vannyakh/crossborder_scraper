#!/usr/bin/env bash
# Start Vite dev server for the panel UI (API proxy → :8000).
set -euo pipefail
cd "$(dirname "$0")/../apps/web"
exec pnpm dev
