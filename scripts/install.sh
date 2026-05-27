#!/usr/bin/env bash
# Crossborder Scraper — self-host one-liner (OpenClaw / aaPanel style)
#
# Linux / macOS (from repo):
#   bash scripts/install.sh
#
# Remote one-liner (clone + install + panel credentials):
#   curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
#
# Options (environment):
#   CROSSBORDER_INSTALL_DIR   install path (default: ~/crossborder-scraper)
#   CROSSBORDER_REPO            git URL (override for forks)
#   CROSSBORDER_BRANCH          git branch (default: main)
#   CROSSBORDER_START=1         start panel after install (background)
#   CROSSBORDER_SKIP_BROWSER=1  skip Playwright (Docker-only hosts)
#
set -euo pipefail

INSTALL_DIR="${CROSSBORDER_INSTALL_DIR:-${HOME}/crossborder-scraper}"
REPO_URL="${CROSSBORDER_REPO:-https://github.com/vannyakh/crossborder_scraper.git}"
BRANCH="${CROSSBORDER_BRANCH:-main}"

banner() {
  echo ""
  echo "  Crossborder Scraper — self-host install"
  echo "  Works on Linux, macOS, and Windows (use install.ps1)."
  echo "  Installs Python deps, panel login, and prints your access URL."
  echo ""
}

detect_local_root() {
  local script_dir=""
  if [[ -n "${BASH_SOURCE[0]:-}" ]] && [[ "${BASH_SOURCE[0]}" != "-" ]]; then
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [[ -f "${script_dir}/../pyproject.toml" ]]; then
      echo "$(cd "${script_dir}/.." && pwd)"
      return 0
    fi
  fi
  if [[ -f "$(pwd)/pyproject.toml" ]] && [[ -f "$(pwd)/scripts/install.sh" ]]; then
    echo "$(pwd)"
    return 0
  fi
  return 1
}

ensure_git() {
  if command -v git >/dev/null 2>&1; then
    return 0
  fi
  echo "==> git is required"
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq || true
    sudo apt-get install -y -qq git
  elif command -v brew >/dev/null 2>&1; then
    brew install git
  else
    echo "Install git and re-run." >&2
    exit 1
  fi
}

ensure_uv() {
  if command -v uv >/dev/null 2>&1; then
    return 0
  fi
  echo "==> installing uv (Python toolchain)"
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="${HOME}/.local/bin:${PATH}"
}

ensure_apt_basics() {
  if ! command -v apt-get >/dev/null 2>&1; then
    return 0
  fi
  echo "==> optional apt packages"
  sudo apt-get update -qq || true
  sudo apt-get install -y -qq curl ca-certificates git build-essential || true
}

clone_or_update() {
  ensure_git
  if [[ -d "${INSTALL_DIR}/.git" ]]; then
    echo "==> updating ${INSTALL_DIR}"
    git -C "${INSTALL_DIR}" fetch --depth 1 origin "${BRANCH}" 2>/dev/null || git -C "${INSTALL_DIR}" fetch origin
    git -C "${INSTALL_DIR}" checkout "${BRANCH}" 2>/dev/null || true
    git -C "${INSTALL_DIR}" pull --ff-only origin "${BRANCH}" 2>/dev/null || true
  else
    echo "==> cloning into ${INSTALL_DIR}"
    mkdir -p "$(dirname "${INSTALL_DIR}")"
    git clone --depth 1 --branch "${BRANCH}" "${REPO_URL}" "${INSTALL_DIR}"
  fi
}

detect_public_ip() {
  if ! command -v curl >/dev/null 2>&1; then
    return 0
  fi
  curl -4 -s --max-time 4 ifconfig.me 2>/dev/null \
    || curl -4 -s --max-time 4 icanhazip.com 2>/dev/null \
    || true
}

run_bootstrap() {
  local root="$1"
  cd "${root}"
  export PYTHONPATH="${root}/src${PYTHONPATH:+:$PYTHONPATH}"

  echo "==> sync Python dependencies"
  uv sync

  if [[ "${CROSSBORDER_SKIP_BROWSER:-}" != "1" ]]; then
    echo "==> install Playwright Chromium"
    uv run python -m playwright install chromium
    if [[ "$(uname -s)" == "Linux" ]] && command -v apt-get >/dev/null 2>&1; then
      uv run python -m playwright install-deps chromium 2>/dev/null || true
    fi
  fi

  local setup_args=(setup --server)
  local public_ip
  public_ip="$(detect_public_ip)"
  if [[ -n "${public_ip}" ]]; then
    echo "==> detected public IP: ${public_ip}"
    setup_args+=(--external "${public_ip}")
  fi

  echo "==> panel setup (host, port, credentials)"
  uv run crossborder "${setup_args[@]}"
}

maybe_start_panel() {
  local root="$1"
  cd "${root}"
  if [[ "${CROSSBORDER_START:-}" != "1" ]]; then
    return 0
  fi
  mkdir -p "${root}/data"
  local log="${root}/data/panel.log"
  echo "==> starting panel in background (log: ${log})"
  nohup uv run crossborder serve --no-reload >>"${log}" 2>&1 &
  echo "    PID $! — open the Login URL from the card above"
}

print_footer() {
  local root="$1"
  echo ""
  echo "==> You're set. Common next steps:"
  echo "    cd ${root}"
  echo "    crossborder --help                   # all commands & options"
  echo "    uv run crossborder serve --no-reload # run panel now"
  echo "    uv run crossborder deploy up         # Docker production"
  echo "    uv run crossborder tools update      # pull + sync + restart"
  echo ""
}

# --- main ---
banner

ROOT=""
if ROOT="$(detect_local_root)"; then
  echo "==> using existing repo: ${ROOT}"
else
  ensure_apt_basics
  clone_or_update
  ROOT="${INSTALL_DIR}"
fi

ensure_uv
run_bootstrap "${ROOT}"

echo "==> CLI installed: crossborder (alias: scraper)"
if [[ -x "${ROOT}/.venv/bin/crossborder" ]]; then
  echo "    ${ROOT}/.venv/bin/crossborder --help"
elif [[ -f "${ROOT}/.venv/Scripts/crossborder.exe" ]]; then
  echo "    ${ROOT}/.venv/Scripts/crossborder.exe --help"
fi
maybe_start_panel "${ROOT}"
print_footer "${ROOT}"
