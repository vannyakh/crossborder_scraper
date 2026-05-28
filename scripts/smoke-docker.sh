#!/usr/bin/env bash
# Build Docker image and verify container /health (CI parity).
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

need_docker

tag="${SMOKE_DOCKER_TAG:-crossborder-scraper:smoke}"
host_port="${SMOKE_DOCKER_PORT:-18787}"
container_name="${SMOKE_DOCKER_NAME:-crossborder-smoke}"

cleanup() {
  docker rm -f "$container_name" 2>/dev/null || true
}
trap cleanup EXIT

if [[ "${SMOKE_SKIP_BUILD:-}" != "1" ]]; then
  echo "==> docker build → ${tag}"
  docker build -t "$tag" .
else
  echo "==> docker build skipped (SMOKE_SKIP_BUILD=1) — using ${tag}"
fi

echo "==> docker run → 127.0.0.1:${host_port}"
docker run -d --name "$container_name" -p "${host_port}:8787" \
  -e PANEL_AUTH_ENABLED=false \
  "$tag"

for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${host_port}/health" >/dev/null 2>&1; then
    echo "Docker production smoke OK (${tag})"
    exit 0
  fi
  sleep 2
done

echo "Container failed health check:" >&2
docker logs "$container_name" >&2
exit 1
