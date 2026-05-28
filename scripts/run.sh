#!/usr/bin/env bash
# Run the panel in development or production mode.
#
# Usage:
#   bash scripts/run.sh dev           # API with reload (Vite proxy when dist/ missing)
#   bash scripts/run.sh dev-ui        # Vite hot reload only
#   bash scripts/run.sh prod          # API serves built apps/web/dist (no reload)
#   bash scripts/run.sh prod-docker   # docker compose + prod overlay (detached)
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

mode="${1:-dev}"
shift || true

case "$mode" in
  dev)
    exec bash "${ROOT}/scripts/serve-api.sh"
    ;;
  dev-ui)
    exec bash "${ROOT}/scripts/dev-ui.sh"
    ;;
  prod)
    load_dotenv
    dist="${ROOT}/apps/web/dist"
    if [[ ! -f "${dist}/index.html" ]]; then
      echo "Missing ${dist}/index.html — run: make build-prod" >&2
      exit 1
    fi
    export UVICORN_RELOAD=0
    export PANEL_UI_DEV=0
    port="$(panel_port)"
    echo "==> run (prod): http://127.0.0.1:${port}/ui/  (static bundle, no reload)"
    exec uv run serve
    ;;
  prod-docker)
    need_docker
    load_dotenv
    port="$(panel_port)"
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d "$@"
    echo "==> prod-docker: http://127.0.0.1:${port}/ui/"
    docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
    ;;
  -h | --help)
    sed -n '2,8p' "$0" | sed 's/^# \?//'
    exit 0
    ;;
  *)
    echo "Unknown mode: $mode (use dev, dev-ui, prod, prod-docker)" >&2
    exit 1
    ;;
esac
