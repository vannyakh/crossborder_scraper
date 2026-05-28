# Shared helpers for repo scripts. Source:  . scripts/_lib.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PYTHONPATH="${ROOT}/src${PYTHONPATH:+:$PYTHONPATH}"

repo_python() {
  if command -v uv >/dev/null 2>&1 && [[ -f "${ROOT}/pyproject.toml" ]]; then
    uv run python "$@"
  else
    python "$@"
  fi
}

repo_crossborder() {
  if command -v uv >/dev/null 2>&1; then
    uv run crossborder "$@"
  elif command -v crossborder >/dev/null 2>&1; then
    crossborder "$@"
  else
    repo_python -m cli.app "$@"
  fi
}

# Backward-compatible alias
repo_scraper() {
  repo_crossborder "$@"
}

need_pnpm() {
  command -v pnpm >/dev/null 2>&1 || {
    echo "pnpm not found. Install: https://pnpm.io" >&2
    exit 1
  }
}

load_dotenv() {
  if [[ -f "${ROOT}/.env" ]]; then
    # shellcheck disable=SC1091
    set -a
    source "${ROOT}/.env"
    set +a
  fi
}

panel_port() {
  load_dotenv
  echo "${PANEL_PORT:-8787}"
}

need_docker() {
  command -v docker >/dev/null 2>&1 || {
    echo "docker not found. Install Docker or use a non-docker target." >&2
    exit 1
  }
}

smoke_imports() {
  uv run python -c "from cli.app import app; from server.app import app as api"
}

web_dir() {
  echo "${ROOT}/apps/web"
}

# True when vite is linkable from apps/web (guards half-written node_modules).
web_deps_ok() {
  local web
  web="$(web_dir)"
  [[ -x "${web}/node_modules/.bin/vite" ]]
}

pnpm_install_web() {
  local web frozen="${1:-0}"
  need_pnpm
  web="$(web_dir)"
  cd "$web"

  export CI=1
  local -a args=(install)
  if [[ "$frozen" == "1" ]]; then
    args+=(--frozen-lockfile)
  fi

  if web_deps_ok; then
    return 0
  fi

  if [[ -d node_modules ]]; then
    echo "==> repairing web deps (removing broken node_modules)" >&2
    rm -rf node_modules
  fi

  if ! pnpm "${args[@]}"; then
    echo "==> pnpm install failed — retrying after clean node_modules" >&2
    rm -rf node_modules
    pnpm "${args[@]}"
  fi

  if ! web_deps_ok; then
    echo "vite still missing after pnpm install — run: rm -rf apps/web/node_modules && make build-dev" >&2
    exit 1
  fi
}
