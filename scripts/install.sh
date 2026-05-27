#!/usr/bin/env bash
# Crossborder Scraper — self-host one-liner
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
#   CROSSBORDER_KEEP_LOCAL=1    keep local git commits (fail instead of reset)
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

sync_to_origin() {
  local dir="$1"
  git -C "${dir}" fetch --depth 1 origin "${BRANCH}" 2>/dev/null || git -C "${dir}" fetch origin "${BRANCH}"
  git -C "${dir}" checkout "${BRANCH}" 2>/dev/null \
    || git -C "${dir}" checkout -B "${BRANCH}" "origin/${BRANCH}"
  if [[ "${CROSSBORDER_KEEP_LOCAL:-}" == "1" ]]; then
    git -C "${dir}" pull --ff-only origin "${BRANCH}" 2>/dev/null || {
      echo "==> could not fast-forward; set CROSSBORDER_KEEP_LOCAL=0 to reset to origin/${BRANCH}" >&2
      exit 1
    }
  elif ! git -C "${dir}" merge --ff-only "origin/${BRANCH}" 2>/dev/null; then
    echo "==> resetting ${dir} to origin/${BRANCH} (discards local commits)"
    git -C "${dir}" reset --hard "origin/${BRANCH}"
  fi
}

clone_or_update() {
  ensure_git
  if [[ -d "${INSTALL_DIR}/.git" ]]; then
    echo "==> updating ${INSTALL_DIR}"
    sync_to_origin "${INSTALL_DIR}"
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

env_val() {
  local key="$1" file="$2"
  [[ -f "${file}" ]] || return 0
  grep -E "^${key}=" "${file}" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d ' "'"'"
}

read_env_port() {
  local root="$1"
  local env_file="${root}/.env"
  local port
  port="$(env_val PANEL_PORT "${env_file}")"
  if [[ -n "${port}" ]]; then
    echo "${port}"
  else
    echo "${PANEL_PORT}"
  fi
}

crossborder_bin() {
  local root="$1"
  echo "${root}/.venv/bin/crossborder"
}

install_global_cli() {
  local root="$1"
  local bin_dir="${HOME}/.local/bin"
  local wrapper_src="${root}/scripts/templates/crossborder-wrapper.sh"
  local wrapper="${bin_dir}/crossborder"

  mkdir -p "${bin_dir}" "${HOME}/.crossborder"
  echo "CROSSBORDER_HOME=${root}" >"${HOME}/.crossborder/install.env"

  if [[ -f "${wrapper_src}" ]]; then
    cp "${wrapper_src}" "${wrapper}"
  else
    cat >"${wrapper}" <<'WRAPPER'
#!/usr/bin/env bash
set -euo pipefail
_home="${HOME}"
[[ -f "${_home}/.crossborder/install.env" ]] && source "${_home}/.crossborder/install.env"
_root="${CROSSBORDER_HOME:-${_home}/crossborder-scraper}"
cd "${_root}" || { echo "crossborder: install dir not found (${_root})" >&2; exit 1; }
export PYTHONPATH="${_root}/src${PYTHONPATH:+:$PYTHONPATH}"
exec "${_root}/.venv/bin/crossborder" "$@"
WRAPPER
  fi
  chmod +x "${wrapper}"
  ln -sf crossborder "${bin_dir}/scraper"
  export PATH="${bin_dir}:${PATH}"
  export CROSSBORDER_HOME="${root}"
}

ensure_shell_path() {
  local root="$1"
  local bin_dir="${HOME}/.local/bin"
  local marker="# crossborder-scraper (install.sh)"
  export PATH="${bin_dir}:${PATH}"
  export CROSSBORDER_HOME="${root}"

  for rc in "${HOME}/.zshrc" "${HOME}/.bashrc" "${HOME}/.profile"; do
    [[ -f "${rc}" ]] || continue
    if grep -qF "${marker}" "${rc}" 2>/dev/null; then
      continue
    fi
    cat >>"${rc}" <<EOF

${marker}
export PATH="\${HOME}/.local/bin:\${PATH}"
export CROSSBORDER_HOME="${root}"
EOF
    echo "==> added crossborder to PATH in ${rc} (open a new terminal or: source ${rc})"
  done
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

  local setup_args=(install --port "${PANEL_PORT}" --external auto)
  if ! "$(crossborder_bin "${root}")" install --help >/dev/null 2>&1; then
    setup_args=(setup --server --port "${PANEL_PORT}" --external auto)
  fi
  local public_ip
  public_ip="$(detect_public_ip)"
  if [[ -n "${public_ip}" ]]; then
    echo "==> detected public IP: ${public_ip}"
  fi

  echo "==> panel setup (host, port ${PANEL_PORT}, credentials)"
  "$(crossborder_bin "${root}")" "${setup_args[@]}"
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
  nohup crossborder serve --no-reload >>"${log}" 2>&1 &
  local pid=$!
  echo "    PID ${pid}"

  local i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 1
    if curl -sf "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
      echo "==> panel is running"
      return 0
    fi
  done
  echo "==> panel not responding yet — check: tail -f ${log}"
  echo "    restart: crossborder serve --no-reload"
}

print_install_complete() {
  local root="$1"
  local env_file="${root}/.env"
  local port username password ext_host lan_ip
  port="$(read_env_port "${root}")"
  username="$(env_val PANEL_USERNAME "${env_file}")"
  password="$(env_val PANEL_PASSWORD "${env_file}")"
  ext_host="$(env_val PANEL_EXTERNAL_HOST "${env_file}")"
  [[ -z "${ext_host}" ]] && ext_host="$(detect_public_ip)"
  lan_ip=""
  if [[ -x "${root}/.venv/bin/python" ]]; then
    lan_ip="$(
      cd "${root}" && PYTHONPATH="${root}/src" "${root}/.venv/bin/python" -c "
from deploy.network import detect_lan_ips
ips = detect_lan_ips()
print(ips[0] if ips else '')
" 2>/dev/null || true
    )"
  fi

  local login_local="http://127.0.0.1:${port}/ui/login"
  local login_lan=""
  local login_public=""
  [[ -n "${lan_ip}" ]] && login_lan="http://${lan_ip}:${port}/ui/login"
  [[ -n "${ext_host}" ]] && login_public="http://${ext_host}:${port}/ui/login"

  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo "  INSTALL COMPLETE — panel ready"
  echo "════════════════════════════════════════════════════════════════"
  echo ""
  if [[ "${CROSSBORDER_START}" == "1" ]]; then
    echo "  Panel:  running in background (port ${port})"
    echo "  Logs:   ${root}/data/panel.log"
  else
    echo "  Panel:  not started (set CROSSBORDER_START=1 or run: crossborder serve --no-reload)"
  fi
  echo ""
  echo "  Login URL (open in browser):"
  echo "    ${login_local}"
  [[ -n "${login_lan}" ]] && echo "    ${login_lan}  (LAN)"
  [[ -n "${login_public}" ]] && echo "    ${login_public}  (public — open firewall port ${port})"
  echo ""
  if [[ -n "${username}" && -n "${password}" ]]; then
    echo "  Username:  ${username}"
    echo "  Password:  ${password}"
  else
    echo "  Credentials:  see access card above or ${env_file}"
  fi
  echo ""
  echo "  CLI (any terminal — no cd, no uv run):"
  echo "    crossborder --help"
  echo "    crossborder deploy status"
  echo "    crossborder serve --no-reload    # foreground"
  echo ""
  echo "  Install dir:  ${root}"
  echo "  Re-install:   curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash"
  echo ""
  echo "  Stop panel:   kill \$(lsof -t -i:${port})   # macOS/Linux"
  echo ""
  echo "  New shell?     source ~/.zshrc   (or open a new terminal for crossborder on PATH)"
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
install_global_cli "${ROOT}"
ensure_shell_path "${ROOT}"
maybe_start_panel "${ROOT}"
print_install_complete "${ROOT}"
