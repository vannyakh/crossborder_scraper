#!/usr/bin/env bash
# Global crossborder CLI — installed by scripts/install.sh into ~/.local/bin/
set -euo pipefail
_home="${HOME}"
if [[ -f "${_home}/.crossborder/install.env" ]]; then
  # shellcheck source=/dev/null
  source "${_home}/.crossborder/install.env"
fi
_root="${CROSSBORDER_HOME:-${_home}/crossborder-scraper}"
if [[ ! -d "${_root}" ]]; then
  echo "crossborder: install directory not found (${_root})" >&2
  echo "Re-run: curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash" >&2
  exit 1
fi
cd "${_root}" || exit 1
export PYTHONPATH="${_root}/src${PYTHONPATH:+:$PYTHONPATH}"
_cli="${_root}/.venv/bin/crossborder"
if [[ ! -x "${_cli}" ]]; then
  echo "crossborder: missing ${_cli} — run install.sh from ${_root}" >&2
  exit 1
fi
exec "${_cli}" "$@"
