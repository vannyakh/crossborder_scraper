#!/usr/bin/env bash
# Start API briefly and verify /health + /ui/ (production bundle must exist).
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

dist="${ROOT}/apps/web/dist"
if [[ ! -f "${dist}/index.html" ]]; then
  echo "Missing ${dist}/index.html — run: make build-prod" >&2
  exit 1
fi

port="${SMOKE_PORT:-9876}"
export UVICORN_RELOAD=0
export PANEL_UI_DEV=0
export PANEL_PORT="$port"
export PANEL_AUTH_ENABLED=false
export PANEL_HOST=127.0.0.1

uv run python -m uvicorn server.app:app --host 127.0.0.1 --port "$port" &
pid=$!

cleanup() {
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 40); do
  if curl -sf --max-time 1 "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

health="$(curl -sf "http://127.0.0.1:${port}/health")"
echo "$health" | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"'

ui_code="$(curl -sf -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}/ui/")"
if [[ "$ui_code" != "200" && "$ui_code" != "304" ]]; then
  echo "Expected /ui/ HTTP 200, got ${ui_code}" >&2
  exit 1
fi

echo "Production HTTP smoke OK (port ${port})"
