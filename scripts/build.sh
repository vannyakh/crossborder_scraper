#!/usr/bin/env bash
# Build dependencies and (for prod) the panel bundle / Docker image.
#
# Usage:
#   bash scripts/build.sh dev          # uv sync + pnpm install (no dist/)
#   bash scripts/build.sh prod         # sync + frozen pnpm install + pnpm build
#   bash scripts/build.sh docker       # docker compose build (dev compose file)
#   bash scripts/build.sh prod-docker  # docker compose with prod overlay
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

mode="${1:-dev}"

case "$mode" in
  dev)
    echo "==> build (dev): Python deps + web node_modules"
    uv sync --all-groups
    pnpm_install_web 0
    ;;
  prod)
    echo "==> build (prod): Python deps + panel production bundle"
    uv sync --all-groups
    pnpm_install_web 1
    cd "$(web_dir)"
    pnpm build
    echo "==> prod bundle: apps/web/dist/"
    ;;
  docker)
    echo "==> build (docker): local compose image"
    need_docker
    docker compose build
    ;;
  prod-docker)
    echo "==> build (prod-docker): compose + prod overlay"
    need_docker
    docker compose -f docker-compose.yml -f docker-compose.prod.yml build
    ;;
  -h | --help)
    sed -n '2,8p' "$0" | sed 's/^# \?//'
    exit 0
    ;;
  *)
    echo "Unknown mode: $mode (use dev, prod, docker, prod-docker)" >&2
    exit 1
    ;;
esac
