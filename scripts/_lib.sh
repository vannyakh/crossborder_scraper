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

repo_scraper() {
  if command -v uv >/dev/null 2>&1; then
    uv run scraper "$@"
  else
    repo_python -m cli.app "$@"
  fi
}

need_pnpm() {
  command -v pnpm >/dev/null 2>&1 || {
    echo "pnpm not found. Install: https://pnpm.io" >&2
    exit 1
  }
}
