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
#   CROSSBORDER_PORT            panel port (default: 8787 — avoids 8000 conflicts)
#   CROSSBORDER_START=1         start panel after install (default: 1)
#   CROSSBORDER_START=0         skip auto-start
#   CROSSBORDER_SKIP_BROWSER=1  skip Playwright (Docker-only hosts)
#
set -euo pipefail

INSTALL_DIR="${CROSSBORDER_INSTALL_DIR:-${HOME}/crossborder-scraper}"
REPO_URL="${CROSSBORDER_REPO:-https://github.com/vannyakh/crossborder_scraper.git}"
BRANCH="${CROSSBORDER_BRANCH:-main}"
PANEL_PORT="${CROSSBORDER_PORT:-8787}"
CROSSBORDER_START="${CROSSBORDER_START:-1}"

banner() {
  echo ""
  echo "  Crossborder Scraper — self-host install"
  echo "  Works on Linux, macOS, and Windows (use install.ps1)."
  echo "  Default panel port: ${PANEL_PORT} (set CROSSBORDER_PORT to override)"
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

read_env_port() {
  local root="$1"
  local env_file="${root}/.env"
  if [[ -f "${env_file}" ]]; then
    local line
    line="$(grep -E '^PANEL_PORT=' "${env_file}" | tail -1 || true)"
    if [[ -n "${line}" ]]; then
      echo "${line#PANEL_PORT=}" | tr -d ' "'"'"
      return 0
    fi
  fi
  echo "${PANEL_PORT}"
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

  local setup_args=(setup --server --port "${PANEL_PORT}")
  local public_ip
  public_ip="$(detect_public_ip)"
  if [[ -n "${public_ip}" ]]; then
    echo "==> detected public IP: ${public_ip}"
    setup_args+=(--external "${public_ip}")
  fi

  echo "==> panel setup (host, port ${PANEL_PORT}, credentials)"
  uv run crossborder "${setup_args[@]}"
}

maybe_start_panel() {
  local root="$1"
  if [[ "${CROSSBORDER_START}" != "1" ]]; then
    return 0
  fi
  cd "${root}"
  mkdir -p "${root}/data"
  local log="${root}/data/panel.log"
  local port
  port="$(read_env_port "${root}")"

  if command -v lsof >/dev/null 2>&1 && lsof -i ":${port}" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "==> panel already listening on port ${port}"
    return 0
  fi

  echo "==> starting panel on port ${port} (log: ${log})"
  nohup uv run crossborder serve --no-reload >>"${log}" 2>&1 &
  local pid=$!
  echo "    PID ${pid}"

  local i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 1
    if curl -sf "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
      echo "==> panel is up — open in browser:"
      echo "    http://127.0.0.1:${port}/ui/login"
      return 0
    fi
  done
  echo "==> panel not responding yet — check: tail -f ${log}"
  echo "    then start manually: cd ${root} && uv run crossborder serve --no-reload"
}

print_footer() {
  local root="$1"
  local port
  port="$(read_env_port "${root}")"
  local login="http://127.0.0.1:${port}/ui/login"
  local panel="http://127.0.0.1:${port}/ui/"

  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo "  HOW TO USE (read this)"
  echo "════════════════════════════════════════════════════════════════"
  echo ""
  echo "  1) Go to the install folder:"
  echo "       cd ${root}"
  echo ""
  echo "  2) Start the panel (required — links do nothing until this runs):"
  if [[ "${CROSSBORDER_START}" == "1" ]]; then
    echo "       Already started if you saw \"panel is up\" above."
    echo "       If not, run:"
  fi
  echo "       uv run crossborder serve --no-reload"
  echo "       (keep that terminal open)"
  echo ""
  echo "  3) Open the panel in your browser:"
  echo "       Login:  ${login}"
  echo "       Panel:  ${panel}"
  echo "       (username/password are in the access card above and in .env)"
  echo ""
  echo "  CLI note:  crossborder is NOT on your global PATH after install."
  echo "       Always use:  cd ${root} && uv run crossborder --help"
  echo "       Or:          ${root}/.venv/bin/crossborder --help"
  echo ""
  echo "  Change port:  uv run crossborder setup --port 9000 --server"
  echo "                (or set CROSSBORDER_PORT=9000 before re-running install.sh)"
  echo ""
  echo "  Stop panel:   kill \$(lsof -t -i:${port})   # macOS/Linux"
  echo ""
  echo "════════════════════════════════════════════════════════════════"
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
maybe_start_panel "${ROOT}"
print_footer "${ROOT}"
