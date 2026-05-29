#!/bin/bash
# Cross-Border panel launcher — called by launchd LaunchAgent
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# launchd provides a minimal environment; restore essentials
export HOME="${HOME:-/Users/$(id -un)}"
export USER="${USER:-$(id -un)}"
export PYTHONPATH="$ROOT/src"
export UVICORN_RELOAD=0
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

mkdir -p "$ROOT/data"

# Log launcher context for debugging
echo "[panel-launch] $(date): starting from $ROOT, HOME=$HOME" >> "$ROOT/data/panel.log" 2>&1

exec "$ROOT/.venv/bin/python" -m server
