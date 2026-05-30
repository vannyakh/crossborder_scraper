#!/usr/bin/env bash
# Cross-Border — self-host one-liner (local machine, LAN server, cloud VPS)
#
# Same command everywhere:
#   curl -fsSL https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh | bash
#
# From repo:
#   bash scripts/install.sh
#
# Help:
#   CROSSBORDER_HELP=1 curl -fsSL .../install.sh | bash
#
# Options (environment):
#   CROSSBORDER_INSTALL_DIR   install path (default: ~/crossborder-scraper, or wwwroot when CROSSBORDER_VPS=1)
#   CROSSBORDER_REPO            git URL (override for forks)
#   CROSSBORDER_BRANCH          git branch or tag (default: main; use v0.1.1 for a release)
#   CROSSBORDER_OPEN_FIREWALL=1 open ufw / firewalld for panel port
#   CROSSBORDER_SKIP_FIREWALL=1 skip auto firewall on cloud VMs
#   CROSSBORDER_PORT            panel port (default: 8787)
#   CROSSBORDER_START=1         start panel after install (default: 1)
#   CROSSBORDER_START=0         skip auto-start
#   CROSSBORDER_SKIP_BROWSER=1  skip Playwright (Docker-only hosts)
#   CROSSBORDER_SKIP_UI_BUILD=1 skip apps/web build
#   CROSSBORDER_KEEP_LOCAL=1    keep local git commits (fail instead of reset)
#   CROSSBORDER_VPS=1           force /www/wwwroot layout + security entrance
#   CROSSBORDER_WWWROOT=1       same as CROSSBORDER_VPS=1
#   CROSSBORDER_SERVER=1        force server profile (firewall, bind 0.0.0.0, autostart)
#   CROSSBORDER_SITE_NAME       folder under /www/wwwroot (default: crossborder_scraper)
#
set -euo pipefail

INSTALL_URL="${CROSSBORDER_INSTALL_URL:-https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh}"
INSTALL_PROFILE="${CROSSBORDER_INSTALL_PROFILE:-local}"

resolve_install_dir() {
  if [[ -n "${CROSSBORDER_INSTALL_DIR:-}" ]]; then
    echo "${CROSSBORDER_INSTALL_DIR}"
    return
  fi
  if [[ "${CROSSBORDER_VPS:-}" == "1" || "${CROSSBORDER_WWWROOT:-}" == "1" || "${CROSSBORDER_AAPANEL:-}" == "1" ]]; then
    local site="${CROSSBORDER_SITE_NAME:-crossborder_scraper}"
    echo "/www/wwwroot/${site}"
    return
  fi
  echo "${HOME}/crossborder-scraper"
}

detect_public_ip() {
  if ! command -v curl >/dev/null 2>&1; then
    return 0
  fi
  curl -4 -s --max-time 4 ifconfig.me 2>/dev/null \
    || curl -4 -s --max-time 4 icanhazip.com 2>/dev/null \
    || true
}

# Auto-detect: local desktop, cloud/LAN server (home dir), or wwwroot VPS layout.
detect_install_profile() {
  if [[ "${CROSSBORDER_VPS:-}" == "1" || "${CROSSBORDER_WWWROOT:-}" == "1" || "${CROSSBORDER_AAPANEL:-}" == "1" ]]; then
    INSTALL_PROFILE="wwwroot"
    return
  fi
  if [[ "${CROSSBORDER_SERVER:-}" == "1" ]]; then
    INSTALL_PROFILE="server"
    return
  fi
  if [[ "$(uname -s)" == "Linux" ]]; then
    local pub_ip
    pub_ip="$(detect_public_ip)"
    if [[ -n "${pub_ip}" ]]; then
      INSTALL_PROFILE="server"
      return
    fi
    # Headless Linux (SSH session, no desktop) — typical LAN/VPS without metadata IP
    if [[ -z "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]]; then
      INSTALL_PROFILE="server"
      return
    fi
  fi
  INSTALL_PROFILE="local"
}

apply_install_profile() {
  case "${INSTALL_PROFILE}" in
    wwwroot)
      export CROSSBORDER_VPS=1
      export CROSSBORDER_WWWROOT=1
      export CROSSBORDER_OPEN_FIREWALL="${CROSSBORDER_OPEN_FIREWALL:-1}"
      ;;
    server)
      export CROSSBORDER_OPEN_FIREWALL="${CROSSBORDER_OPEN_FIREWALL:-1}"
      ;;
    local) ;;
  esac
}

profile_label() {
  case "${INSTALL_PROFILE}" in
    wwwroot) echo "VPS wwwroot (/www/wwwroot)" ;;
    server) echo "server (cloud or LAN — home dir, full network setup)" ;;
    local) echo "local machine" ;;
    *) echo "${INSTALL_PROFILE}" ;;
  esac
}

print_install_help() {
  cat <<EOF

Cross-Border — self-host installer

  One command for your laptop, home server, and cloud VPS:

    curl -fsSL ${INSTALL_URL} | bash

  What it does:
    • Clone or update into ~/crossborder-scraper (or wwwroot with CROSSBORDER_VPS=1)
    • Install Python (uv), Node.js on Linux servers, Playwright, panel web UI
    • Create panel login credentials and write .env
    • Bind panel to 0.0.0.0:8787
    • Register auto-start (systemd on Linux, launchd on macOS)
    • Start the panel and print login URL + username + password

  Auto-detect on Linux:
    • Public IP or headless SSH → server profile (firewall, LAN/public URLs)
    • Desktop session → local profile

  Pin a release (recommended on production VPS):

    curl -fsSL ${INSTALL_URL} | env CROSSBORDER_BRANCH=v0.1.1 bash

  Optional overrides:
    CROSSBORDER_BRANCH=v0.1.1     git tag or branch
    CROSSBORDER_INSTALL_DIR=…     custom install path
    CROSSBORDER_PORT=8787         panel TCP port
    CROSSBORDER_VPS=1             /www/wwwroot layout + security entrance
    CROSSBORDER_SKIP_FIREWALL=1   skip ufw on cloud VMs
    CROSSBORDER_START=0           do not start panel after install
    CROSSBORDER_HELP=1            show this help

  Docs: docs/SELF_HOSTING.md

EOF
}

INSTALL_DIR=""
REPO_URL="${CROSSBORDER_REPO:-https://github.com/vannyakh/crossborder_scraper.git}"
BRANCH="${CROSSBORDER_BRANCH:-main}"
PANEL_PORT="${CROSSBORDER_PORT:-8787}"
CROSSBORDER_START="${CROSSBORDER_START:-1}"

banner() {
  echo ""
  echo "  Cross-Border — self-host install"
  echo "  One command: local machine · LAN server · cloud VPS"
  echo ""
  echo "  Profile:   $(profile_label)"
  echo "  Install:   ${INSTALL_DIR}"
  echo "  Branch:    ${BRANCH}"
  echo "  Port:      ${PANEL_PORT}"
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
  echo "==> apt packages (git, curl, build tools)"
  sudo apt-get update -qq || true
  sudo apt-get install -y -qq curl ca-certificates git build-essential || true
}

ensure_node() {
  if [[ "${CROSSBORDER_SKIP_UI_BUILD:-}" == "1" ]]; then
    return 0
  fi
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)"
    if [[ "${major:-0}" -ge 18 ]]; then
      return 0
    fi
  fi
  [[ "$(uname -s)" == "Linux" ]] || return 0
  echo "==> installing Node.js 20 (panel web UI build)"
  if command -v apt-get >/dev/null 2>&1 && command -v curl >/dev/null 2>&1; then
    if curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null 2>&1 \
      && sudo apt-get install -y -qq nodejs >/dev/null 2>&1; then
      echo "    Node $(node -v 2>/dev/null || echo 20)"
      if command -v corepack >/dev/null 2>&1; then
        corepack enable 2>/dev/null || true
        corepack prepare pnpm@9.15.9 --activate 2>/dev/null || true
      fi
      return 0
    fi
  fi
  echo "    skipped — install Node 20+ manually or set CROSSBORDER_SKIP_UI_BUILD=1"
}

prepare_server_prereqs() {
  [[ "${INSTALL_PROFILE}" == "server" || "${INSTALL_PROFILE}" == "wwwroot" ]] || return 0
  [[ "$(uname -s)" == "Linux" ]] || return 0
  ensure_apt_basics
  ensure_node
}

prepare_vps_prereqs() {
  local dir="$1"
  [[ "$(uname -s)" == "Linux" ]] || return 0
  if [[ "${CROSSBORDER_VPS:-}" != "1" && "${CROSSBORDER_WWWROOT:-}" != "1" && "${CROSSBORDER_AAPANEL:-}" != "1" ]]; then
    return 0
  fi
  echo "==> VPS wwwroot layout: ${dir}"
  local run_root=0
  [[ "$(id -u)" -eq 0 ]] && run_root=1

  if [[ "${run_root}" -eq 1 ]]; then
    mkdir -p /www/wwwroot
    if ! id crossborder >/dev/null 2>&1; then
      useradd -r -s /bin/bash -d "${dir}" crossborder 2>/dev/null || true
    fi
    if id crossborder >/dev/null 2>&1; then
      echo "==> service user: crossborder (home ${dir})"
    fi
  elif command -v sudo >/dev/null 2>&1; then
    sudo mkdir -p /www/wwwroot
  fi
}

finalize_vps_ownership() {
  local dir="$1"
  [[ "$(uname -s)" == "Linux" ]] || return 0
  if [[ "${CROSSBORDER_VPS:-}" != "1" && "${CROSSBORDER_WWWROOT:-}" != "1" && "${CROSSBORDER_AAPANEL:-}" != "1" ]]; then
    return 0
  fi
  [[ -d "${dir}" ]] || return 0
  if [[ "$(id -u)" -eq 0 ]] && id crossborder >/dev/null 2>&1; then
    chown -R crossborder:crossborder "${dir}" 2>/dev/null || true
  elif [[ -n "${SUDO_USER:-}" ]] && command -v sudo >/dev/null 2>&1; then
    sudo chown -R "${SUDO_USER}:${SUDO_USER}" "${dir}" 2>/dev/null || true
  fi
}

ensure_panel_bind_all_interfaces() {
  local root="$1"
  local env_file="${root}/.env"
  [[ -f "${env_file}" ]] || return 0
  if grep -qE '^PANEL_HOST=' "${env_file}" 2>/dev/null; then
    sed -i.bak 's/^PANEL_HOST=.*/PANEL_HOST=0.0.0.0/' "${env_file}" 2>/dev/null \
      || sed -i '' 's/^PANEL_HOST=.*/PANEL_HOST=0.0.0.0/' "${env_file}" 2>/dev/null \
      || true
  else
    echo "PANEL_HOST=0.0.0.0" >>"${env_file}"
  fi
  rm -f "${env_file}.bak" 2>/dev/null || true
}

configure_linux_firewall() {
  local port="$1"
  local root="${2:-${INSTALL_DIR}}"
  [[ "$(uname -s)" == "Linux" ]] || return 0
  local should_open=0
  if [[ "${CROSSBORDER_VPS:-}" == "1" || "${CROSSBORDER_WWWROOT:-}" == "1" || "${CROSSBORDER_AAPANEL:-}" == "1" || "${CROSSBORDER_OPEN_FIREWALL:-}" == "1" ]]; then
    should_open=1
  fi
  # Cloud VM: auto-open host firewall when a public IP is reachable (skip with CROSSBORDER_SKIP_FIREWALL=1)
  if [[ "${CROSSBORDER_SKIP_FIREWALL:-}" != "1" && "${should_open}" -eq 0 ]]; then
    local pub_ip
    pub_ip="$(detect_public_ip)"
    if [[ -n "${pub_ip}" ]]; then
      should_open=1
      echo "==> cloud VM detected (public IP ${pub_ip}) — opening host firewall for port ${port}"
    fi
  fi
  [[ "${should_open}" -eq 1 ]] || return 0
  echo "==> network access (host firewall + panel bind)"
  local py="${root}/.venv/bin/python"
  if [[ -x "${py}" && -d "${root}/src" ]]; then
    PYTHONPATH="${root}/src" "${py}" -c "
from deploy.network_access import run_full_access_setup
r = run_full_access_setup(${port}, ensure_bind=True, enable_ufw=True, open_firewall=True, persist_external=True)
for line in r.get('messages', []):
    print('   ', line)
" 2>/dev/null && return 0
  fi
  if command -v ufw >/dev/null 2>&1; then
    (sudo ufw allow 22/tcp 2>/dev/null; sudo ufw allow "${port}/tcp" && sudo ufw --force enable && sudo ufw reload) 2>/dev/null \
      && echo "    ufw: allowed SSH + ${port}/tcp" \
      || echo "    ufw: skipped (run: crossborder deploy setup-access)"
  fi
}

verify_panel_listen() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    echo "==> listening sockets on :${port}"
    ss -tln 2>/dev/null | grep ":${port}" || echo "    (none — panel may still be starting)"
  fi
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
    if [[ -d "${INSTALL_DIR}" ]]; then
      echo "==> removing incomplete install at ${INSTALL_DIR}"
      rm -rf "${INSTALL_DIR}"
    fi
    echo "==> cloning into ${INSTALL_DIR}"
    mkdir -p "$(dirname "${INSTALL_DIR}")"
    git clone --depth 1 --branch "${BRANCH}" "${REPO_URL}" "${INSTALL_DIR}"
  fi
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

build_panel_ui() {
  local root="$1"
  if [[ -f "${root}/apps/web/dist/index.html" ]]; then
    echo "==> panel UI already built"
    return 0
  fi
  if [[ "${CROSSBORDER_SKIP_UI_BUILD:-}" == "1" ]]; then
    echo "==> skipping UI build (use port 8787 + bash scripts/dev-ui.sh for dev UI on :5173)"
    return 0
  fi
  if ! command -v node >/dev/null 2>&1; then
    echo "==> Node.js not found — panel API works; build UI later:"
    echo "    cd ${root}/apps/web && pnpm install && pnpm build"
    return 0
  fi
  echo "==> build panel web UI"
  (
    cd "${root}/apps/web"
    if command -v corepack >/dev/null 2>&1; then
      corepack enable 2>/dev/null || true
      corepack prepare pnpm@9.15.9 --activate 2>/dev/null || true
    fi
    if ! command -v pnpm >/dev/null 2>&1; then
      npm install -g pnpm@9.15.9 2>/dev/null || true
    fi
    if command -v pnpm >/dev/null 2>&1; then
      pnpm install --frozen-lockfile
      pnpm build
    else
      echo "==> pnpm not available — install Node 20+ or run bash scripts/dev-ui.sh" >&2
      return 1
    fi
  )
}

run_bootstrap() {
  local root="$1"
  cd "${root}"
  export PYTHONPATH="${root}/src${PYTHONPATH:+:$PYTHONPATH}"

  echo "==> sync Python dependencies"
  uv sync

  build_panel_ui "${root}"

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
  ensure_panel_bind_all_interfaces "${root}"

  if [[ "${CROSSBORDER_VPS:-}" == "1" || "${CROSSBORDER_WWWROOT:-}" == "1" ]]; then
    echo "CROSSBORDER_VAR_LAYOUT=1" >>"${root}/.env" 2>/dev/null || true
    PYTHONPATH="${root}/src" "${root}/.venv/bin/python" -c "
from deploy.vps_layout import init_runtime_tree
created = init_runtime_tree()
print('==> runtime folders:', ', '.join(created))
from core.paths import layout_summary
for k, v in layout_summary().items():
    print(f'    {k}: {v}')
" 2>/dev/null || true
  fi
}

register_autostart() {
  local root="$1"
  if [[ "${CROSSBORDER_AUTOSTART:-1}" == "0" ]]; then
    return 0
  fi
  echo "==> registering auto-start service"
  local py="${root}/.venv/bin/python"
  [[ -x "${py}" ]] || return 0

  local os_name
  os_name="$(uname -s)"

  if [[ "${os_name}" == "Darwin" ]]; then
    # macOS — launchd LaunchAgent
    PYTHONPATH="${root}/src" "${py}" -c "
from deploy.autostart import autostart
r = autostart('enable')
print('   ', r.message)
if r.detail: print('   ', r.detail)
" 2>/dev/null && return 0
    echo "    launchd: could not register — run: crossborder deploy autostart"

  elif [[ "${os_name}" == "Linux" ]]; then
    # Linux — systemd user service (no sudo needed)
    PYTHONPATH="${root}/src" "${py}" -c "
from deploy.autostart import autostart
r = autostart('enable')
print('   ', r.message)
if r.detail: print('   ', r.detail)
" 2>/dev/null && return 0
    echo "    systemd: could not register — run: crossborder deploy autostart"
  fi
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
  local cb
  cb="$(crossborder_bin "${root}")"
  export PATH="${HOME}/.local/bin:${PATH}"
  nohup "${cb}" serve --no-reload >>"${log}" 2>&1 &
  local pid=$!
  echo "    PID ${pid}"
  configure_linux_firewall "${port}" "${root}"

  local i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 1
    if curl -sf "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
      echo "==> panel is running"
      verify_panel_listen "${port}"
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
  echo "  Login URL (open in browser — use port ${port}, NOT :5173):"
  echo "    ${login_local}"
  [[ -n "${login_lan}" ]] && echo "    ${login_lan}  (LAN)"
  [[ -n "${login_public}" ]] && echo "    ${login_public}  (public)"
  echo ""
  if [[ -n "${login_public}" ]]; then
    echo "  VPS public access (if browser cannot connect):"
    echo "    1. Cloud security group: allow inbound TCP ${port} to this server"
    echo "    2. Host firewall: sudo ufw allow ${port}/tcp  (or: crossborder deploy firewall)"
    echo "    3. Panel binds 0.0.0.0 — check: ss -tln | grep ${port}"
    echo "    4. Test: curl -sI http://127.0.0.1:${port}/health"
    [[ -n "${ext_host}" ]] && echo "    5. From your PC: curl -sI http://${ext_host}:${port}/health"
    echo ""
  fi
  if [[ -n "${username}" && -n "${password}" ]]; then
    echo "  Username:  ${username}"
    echo "  Password:  ${password}"
  else
    echo "  Credentials:  see access card above or ${env_file}"
  fi
  echo ""
  echo "  CLI (any terminal — no cd, no uv run):"
  echo "    crossborder --help"
  echo "    crossborder service status"
  echo "    crossborder gateway              # agent hub status"
  echo "    crossborder chat                 # interactive agent"
  echo "    crossborder agent \"list schedules\""
  echo "    crossborder schedules list"
  echo "    crossborder skills list"
  echo "    crossborder integrate list       # Telegram, Discord, …"
  echo "    crossborder service start        # background panel"
  echo "    crossborder serve --no-reload    # foreground panel"
  echo ""
  echo "  Install dir:  ${root}"
  if [[ "${CROSSBORDER_VPS:-}" == "1" || "${CROSSBORDER_WWWROOT:-}" == "1" ]]; then
    echo ""
    echo "  Runtime layout (mutable — backup this tree):"
    echo "    ${root}/var/data/      scrape DB, cookies, output"
    echo "    ${root}/var/plugins/   uploaded scrape plugins (ZIP)"
    echo "    ${root}/var/skills/    uploaded agent skills (ZIP)"
    echo "    ${root}/var/uploads/   panel file uploads"
    echo "    ${root}/var/logs/       operation / cron logs"
    echo "    ${root}/config/        panel settings (ui_config.json)"
  fi
  echo "  Re-install:   curl -fsSL ${INSTALL_URL} | bash"
  echo "  Help:         CROSSBORDER_HELP=1 curl -fsSL ${INSTALL_URL} | bash"
  echo ""
  echo "  Stop panel:   kill \$(lsof -t -i:${port})   # macOS/Linux"
  echo ""
  echo "  New shell?     source ~/.zshrc   (or open a new terminal for crossborder on PATH)"
  echo ""
  echo "  ── If 'crossborder' command is not found ──────────────────"
  echo "  Run from the install directory (always works, no PATH needed):"
  echo "    cd ${root}"
  echo "    source .venv/bin/activate"
  echo "    python -m server                      # foreground"
  echo "    nohup python -m server >> data/panel.log 2>&1 &  # background"
  echo "  Or without activating the venv:"
  echo "    uv run serve"
  echo "  ────────────────────────────────────────────────────────────"
  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo ""
}

# --- main ---
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || "${CROSSBORDER_HELP:-}" == "1" ]]; then
  print_install_help
  exit 0
fi

detect_install_profile
apply_install_profile
INSTALL_DIR="$(resolve_install_dir)"

banner

ROOT=""
if ROOT="$(detect_local_root)"; then
  echo "==> using existing repo: ${ROOT}"
  prepare_server_prereqs
else
  prepare_server_prereqs
  prepare_vps_prereqs "${INSTALL_DIR}"
  clone_or_update
  ROOT="${INSTALL_DIR}"
  finalize_vps_ownership "${ROOT}"
fi

ensure_uv
run_bootstrap "${ROOT}"
install_global_cli "${ROOT}"
ensure_shell_path "${ROOT}"
register_autostart "${ROOT}"
maybe_start_panel "${ROOT}"
print_install_complete "${ROOT}"
