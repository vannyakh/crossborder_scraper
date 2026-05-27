#!/usr/bin/env bash
# Run FastAPI from repository root.
set -euo pipefail
cd "$(dirname "$0")/.."
exec python -m uvicorn server.app:app --host 0.0.0.0 --port "${PANEL_PORT:-8000}" --reload
