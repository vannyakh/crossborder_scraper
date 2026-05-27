#!/usr/bin/env bash
# Panel maintenance — sync, update, restart, reset
#   bash scripts/tools.sh sync
#   bash scripts/tools.sh update
#   bash scripts/tools.sh restart
#   bash scripts/tools.sh reset credentials
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

cmd="${1:-}"
shift || true

case "${cmd}" in
  sync)    repo_scraper tools sync "$@" ;;
  update)  repo_scraper tools update "$@" ;;
  restart) repo_scraper tools restart "$@" ;;
  reset)   repo_scraper tools reset "$@" ;;
  *)
    echo "Usage: bash scripts/tools.sh {sync|update|restart|reset} [options]" >&2
    echo "" >&2
    echo "  sync     — git pull + uv sync" >&2
    echo "  update   — sync + restart panel" >&2
    echo "  restart  — docker / systemd / process" >&2
    echo "  reset    — credentials | config | data | cache | all" >&2
    exit 1
    ;;
esac
