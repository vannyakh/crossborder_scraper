#!/usr/bin/env bash
# Run test suites for development or production builds.
#
# Usage:
#   bash scripts/test.sh dev              # pytest + import smoke (default)
#   bash scripts/test.sh dev -v           # verbose pytest
#   bash scripts/test.sh dev -k gateway   # pytest name filter
#   bash scripts/test.sh prod             # build prod bundle + HTTP smoke
#   bash scripts/test.sh prod-docker      # docker build + container health
#   bash scripts/test.sh dev -- -x -v     # raw pytest args after --
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

suite=dev
if [[ $# -gt 0 && "$1" =~ ^(dev|prod|prod-docker)$ ]]; then
  suite="$1"
  shift
fi

run_dev_pytest() {
  local mode=quiet
  local pytest_args=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -v | --verbose)
        mode=verbose
        shift
        ;;
      -k)
        pytest_args+=("-k" "${2:?missing -k pattern}")
        shift 2
        ;;
      --)
        shift
        pytest_args+=("$@")
        break
        ;;
      -h | --help)
        sed -n '2,11p' "$0" | sed 's/^# \?//'
        exit 0
        ;;
      *)
        pytest_args+=("$1")
        shift
        ;;
    esac
  done

  case "$mode" in
    quiet)
      if [[ ${#pytest_args[@]} -gt 0 ]]; then
        pytest_args=("-q" "${pytest_args[@]}")
      else
        pytest_args=("-q")
      fi
      ;;
    verbose)
      if [[ ${#pytest_args[@]} -gt 0 ]]; then
        pytest_args=("-v" "${pytest_args[@]}")
      else
        pytest_args=("-v")
      fi
      ;;
  esac

  uv run pytest tests/ "${pytest_args[@]}"
}

case "$suite" in
  dev)
    echo "==> test (dev): pytest + import smoke"
    run_dev_pytest "$@"
    smoke_imports
    ;;
  prod)
    echo "==> test (prod): build bundle + import smoke + HTTP smoke"
    bash "${ROOT}/scripts/build.sh" prod
    smoke_imports
    bash "${ROOT}/scripts/smoke-http.sh"
    ;;
  prod-docker)
    echo "==> test (prod-docker): docker build + container health"
    bash "${ROOT}/scripts/smoke-docker.sh"
    ;;
  *)
    echo "Unknown suite: $suite (use dev, prod, prod-docker)" >&2
    exit 1
    ;;
esac
