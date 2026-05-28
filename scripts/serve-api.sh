#!/usr/bin/env bash
# Run FastAPI panel API from repo root (with reload).
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

load_dotenv
export UVICORN_RELOAD="${UVICORN_RELOAD:-1}"
export PANEL_PORT="${PANEL_PORT:-8787}"

port="$(panel_port)"
echo "==> Cross-Border API (reload=${UVICORN_RELOAD}) → http://127.0.0.1:${port}/ui/"

if command -v uv >/dev/null 2>&1; then
  exec uv run serve
fi

exec repo_python -m server
