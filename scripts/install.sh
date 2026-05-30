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
#   CROSSBORDER_NGINX=1         install/configure nginx HTTP proxy on port 80 (server/VPS)
#   CROSSBORDER_SKIP_NGINX=1    skip nginx setup even when nginx is already installed
#   CROSSBORDER_YES=1           skip reinstall confirmation (required for curl | bash non-TTY)
#
set -euo pipefail

INSTALL_URL="${CROSSBORDER_INSTALL_URL:-https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.sh}"
INSTALL_PROFILE="${CROSSBORDER_INSTALL_PROFILE:-local}"
INSTALL_WAS_UPDATE=0
DOCS_INSTALL="docs/INSTALL.md"

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
  # Host panel wwwroot layout (/www/wwwroot) — same site tree as common Linux host panels
  if [[ "$(uname -s)" == "Linux" && -d /www/wwwroot && "${CROSSBORDER_HOME_INSTALL:-}" != "1" ]]; then
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
  export CROSSBORDER_INSTALL_PROFILE="${INSTALL_PROFILE}"
  case "${INSTALL_PROFILE}" in
    wwwroot)
      export CROSSBORDER_VPS=1
      export CROSSBORDER_WWWROOT=1
      export CROSSBORDER_OPEN_FIREWALL="${CROSSBORDER_OPEN_FIREWALL:-1}"
      export PANEL_SECURITY_ENTRANCE=1
      export PANEL_PUBLIC_HTTP_PORT="${PANEL_PUBLIC_HTTP_PORT:-80}"
      ;;
    server)
      export CROSSBORDER_OPEN_FIREWALL="${CROSSBORDER_OPEN_FIREWALL:-1}"
      export PANEL_SECURITY_ENTRANCE=1
      export PANEL_PUBLIC_HTTP_PORT="${PANEL_PUBLIC_HTTP_PORT:-80}"
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
    CROSSBORDER_NGINX=1           install nginx + HTTP proxy on port 80
    CROSSBORDER_SKIP_NGINX=1      skip nginx setup
    CROSSBORDER_YES=1             skip reinstall confirm (non-interactive / curl | bash)
    CROSSBORDER_SKIP_FIREWALL=1   skip ufw on cloud VMs
    CROSSBORDER_START=0           do not start panel after install
    CROSSBORDER_HELP=1            show this help

  Docs: ${DOCS_INSTALL} · docs/SELF_HOSTING.md

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
      return 0
    fi
  fi
  echo "    skipped — install Node 20+ manually or set CROSSBORDER_SKIP_UI_BUILD=1"
}

# pnpm via corepack needs root (symlinks into /usr/bin). Install user-local instead.
pnpm_home() {
  echo "${HOME}/.local/share/pnpm"
}

refresh_node_path() {
  export PNPM_HOME="$(pnpm_home)"
  export PATH="${PNPM_HOME}:${HOME}/.local/bin:${PATH}"
}

pnpm_bin() {
  refresh_node_path
  if [[ -x "${PNPM_HOME}/pnpm" ]]; then
    echo "${PNPM_HOME}/pnpm"
    return 0
  fi
  return 1
}

pnpm_works() {
  local bin
  if bin="$(pnpm_bin)"; then
    "${bin}" -v >/dev/null 2>&1
    return $?
  fi
  refresh_node_path
  if command -v pnpm >/dev/null 2>&1 && pnpm -v >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

ensure_pnpm() {
  if [[ "${CROSSBORDER_SKIP_UI_BUILD:-}" == "1" ]]; then
    return 0
  fi
  refresh_node_path
  if pnpm_works; then
    local bin ver
    bin="$(pnpm_bin 2>/dev/null || true)"
    ver="$("${bin:-pnpm}" -v 2>/dev/null || echo ok)"
    echo "    pnpm ${ver}"
    return 0
  fi
  if ! command -v node >/dev/null 2>&1; then
    return 0
  fi
  echo "==> installing pnpm (user-local, no sudo)"
  # Avoid broken system corepack shims during install
  export COREPACK_ENABLE_AUTO_PIN=0
  export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
  if curl -fsSL https://get.pnpm.io/install.sh | env PNPM_HOME="${PNPM_HOME}" SHELL="bash" sh -; then
    refresh_node_path
    hash -r 2>/dev/null || true
    if pnpm_works; then
      local bin ver
      bin="$(pnpm_bin)"
      ver="$("${bin}" -v 2>/dev/null || echo ok)"
      echo "    pnpm ${ver}"
      return 0
    fi
  fi
  mkdir -p "${HOME}/.local/bin"
  if npm install -g pnpm@9.15.9 --prefix "${HOME}/.local" 2>/dev/null; then
    refresh_node_path
    hash -r 2>/dev/null || true
    if pnpm_works; then
      echo "    pnpm $(pnpm -v 2>/dev/null || echo ok)"
      return 0
    fi
  fi
  echo "    pnpm install failed — UI build may be skipped"
  return 1
}

prepare_server_prereqs() {
  [[ "${INSTALL_PROFILE}" == "server" || "${INSTALL_PROFILE}" == "wwwroot" ]] || return 0
  [[ "$(uname -s)" == "Linux" ]] || return 0
  ensure_apt_basics
  ensure_node
  ensure_pnpm || true
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
  elif command -v sudo >/dev/null 2>&1; then
    local target_user="${SUDO_USER:-$(id -un)}"
    sudo chown -R "${target_user}:${target_user}" "${dir}" 2>/dev/null || true
  fi
}

# Git refuses repos owned by another user (common on /www/wwwroot after sudo install).
ensure_git_repo_access() {
  local dir="$1"
  [[ -d "${dir}" ]] || return 0
  local me owner
  me="$(id -un)"
  owner="$(stat -c '%U' "${dir}" 2>/dev/null || stat -f '%Su' "${dir}" 2>/dev/null || echo "")"
  if [[ -n "${owner}" && "${owner}" != "${me}" ]]; then
    echo "==> wwwroot repo owned by ${owner}; aligning for ${me}"
    if [[ "$(id -u)" -eq 0 ]]; then
      chown -R "${me}:${me}" "${dir}" 2>/dev/null || true
    elif command -v sudo >/dev/null 2>&1 && sudo chown -R "${me}:${me}" "${dir}" 2>/dev/null; then
      echo "    chown ${dir} → ${me}"
    else
      echo "    registering git safe.directory (or run: sudo chown -R ${me}:${me} ${dir})"
    fi
  fi
  if [[ -d "${dir}/.git" ]]; then
    git config --global --add safe.directory "${dir}" 2>/dev/null || true
  fi
}

prepare_wwwroot_install_access() {
  local dir="$1"
  [[ "${INSTALL_PROFILE}" == "wwwroot" ]] || return 0
  [[ "$(uname -s)" == "Linux" ]] || return 0
  local me
  me="$(id -un)"
  if [[ ! -d "$(dirname "${dir}")" ]] && command -v sudo >/dev/null 2>&1; then
    sudo mkdir -p "$(dirname "${dir}")" 2>/dev/null || true
  fi
  if [[ -d "${dir}" ]]; then
    ensure_git_repo_access "${dir}"
  elif [[ "$(id -u)" -ne 0 ]] && command -v sudo >/dev/null 2>&1; then
    sudo mkdir -p "${dir}" 2>/dev/null || true
    sudo chown -R "${me}:${me}" "${dir}" 2>/dev/null || true
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

read_pyproject_version() {
  local file="$1"
  [[ -f "${file}" ]] || return 0
  grep -E '^version\s*=' "${file}" 2>/dev/null | head -1 \
    | sed -E 's/^version\s*=\s*"([^"]+)".*/\1/' \
    | sed -E 's/^version\s*=\s'\''([^'\'']+)'\''.*/\1/'
}

read_installed_version() {
  local root="$1"
  read_pyproject_version "${root}/pyproject.toml"
}

peek_target_version() {
  local dir="$1"
  local ver=""
  if [[ -d "${dir}/.git" ]]; then
    git -C "${dir}" fetch --depth 1 origin "${BRANCH}" 2>/dev/null \
      || git -C "${dir}" fetch origin "${BRANCH}" 2>/dev/null \
      || true
    ver="$(git -C "${dir}" show "origin/${BRANCH}:pyproject.toml" 2>/dev/null \
      | grep -E '^version\s*=' | head -1 \
      | sed -E 's/^version\s*=\s*"([^"]+)".*/\1/')"
  fi
  if [[ -z "${ver}" ]]; then
    ver="${BRANCH}"
  fi
  echo "${ver}"
}

is_existing_install() {
  local dir="$1"
  [[ -d "${dir}/.git" ]] || [[ -f "${dir}/.env" ]]
}

confirm_reinstall_update() {
  local dir="$1"
  is_existing_install "${dir}" || return 0
  if [[ "${CROSSBORDER_YES:-}" == "1" || "${CROSSBORDER_CONFIRMED:-}" == "1" ]]; then
    return 0
  fi

  local current target
  current="$(read_installed_version "${dir}")"
  [[ -z "${current}" ]] && current="(unknown)"
  target="$(peek_target_version "${dir}")"

  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo "  Existing Cross-Border installation"
  echo "════════════════════════════════════════════════════════════════"
  echo ""
  echo "  Install path:     ${dir}"
  echo "  Current version:  ${current}"
  echo "  Target version:   ${target}  (origin/${BRANCH})"
  echo ""
  echo "  Re-install will:"
  echo "    • Replace application code with origin/${BRANCH}"
  echo "    • Refresh Python deps and rebuild the panel UI"
  echo "    • Restart the panel"
  echo ""
  echo "  Preserved: .env credentials, security entrance, data/, config/"
  echo ""

  if [[ ! -t 0 ]]; then
    echo "  Non-interactive shell — confirmation required."
    echo "  Re-run with:"
    echo "    CROSSBORDER_YES=1 curl -fsSL ${INSTALL_URL} | env CROSSBORDER_BRANCH=${BRANCH} bash"
    echo "  Or SSH in and run interactively (recommended):"
    echo "    bash ${dir}/scripts/install.sh"
    echo ""
    exit 1
  fi

  local reply
  read -r -p "  Continue with update? [y/N]: " reply
  case "${reply}" in
    y | Y | yes | Yes | YES)
      export CROSSBORDER_CONFIRMED=1
      echo ""
      return 0
      ;;
    *)
      echo ""
      echo "  Update cancelled — no changes made."
      exit 0
      ;;
  esac
}

clone_or_update() {
  ensure_git
  if [[ -d "${INSTALL_DIR}/.git" ]]; then
    echo "==> updating ${INSTALL_DIR} (existing install — .env and data preserved)"
    INSTALL_WAS_UPDATE=1
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

export PATH="${HOME}/.local/share/pnpm:${HOME}/.local/bin:${PATH}"

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
export PATH="\${HOME}/.local/share/pnpm:\${HOME}/.local/bin:\${PATH}"
export CROSSBORDER_HOME="${root}"
EOF
    echo "==> added crossborder to PATH in ${rc} (open a new terminal or: source ${rc})"
  done
}

link_system_cli() {
  local root="$1"
  local wrapper="${HOME}/.local/bin/crossborder"
  [[ -x "${wrapper}" ]] || return 0
  if [[ -w /usr/local/bin ]] 2>/dev/null; then
    ln -sf "${wrapper}" /usr/local/bin/crossborder
    ln -sf "${wrapper}" /usr/local/bin/scraper
    echo "==> CLI available: /usr/local/bin/crossborder"
  elif command -v sudo >/dev/null 2>&1; then
    if sudo ln -sf "${wrapper}" /usr/local/bin/crossborder 2>/dev/null; then
      sudo ln -sf "${wrapper}" /usr/local/bin/scraper 2>/dev/null || true
      echo "==> CLI available: /usr/local/bin/crossborder (system-wide)"
    fi
  fi
  mkdir -p "${root}/bin"
  ln -sf "${root}/.venv/bin/crossborder" "${root}/bin/crossborder"
  ln -sf "${root}/.venv/bin/crossborder" "${root}/bin/scraper"
  echo "==> CLI shortcut: ${root}/bin/crossborder --help"
}

verify_global_cli() {
  local root="$1"
  export PATH="${HOME}/.local/bin:${PATH}"
  if command -v crossborder >/dev/null 2>&1; then
    echo "==> crossborder CLI ready ($(command -v crossborder))"
    return 0
  fi
  if [[ -x "${root}/.venv/bin/crossborder" ]]; then
    echo "==> crossborder CLI: source ~/.bashrc  or  ${root}/.venv/bin/crossborder --help"
  fi
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
  ensure_pnpm || true
  refresh_node_path
  export COREPACK_ENABLE_AUTO_PIN=0
  export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
  echo "==> build panel web UI"
  local pnpm_cmd=""
  if pnpm_cmd="$(pnpm_bin)"; then
    :
  elif pnpm_works; then
    pnpm_cmd="pnpm"
  fi
  if ! (
    cd "${root}/apps/web"
    if [[ -n "${pnpm_cmd}" ]]; then
      "${pnpm_cmd}" install --frozen-lockfile
      "${pnpm_cmd}" build
    elif command -v npx >/dev/null 2>&1; then
      npx --yes pnpm@9.15.9 install --frozen-lockfile
      npx --yes pnpm@9.15.9 build
    else
      exit 1
    fi
  ); then
    echo "==> panel UI build failed — API still works; retry later:"
    echo "    cd ${root}/apps/web && pnpm install && pnpm build"
    return 0
  fi
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
  export CROSSBORDER_DEFER_ACCESS_CARD=1
  "$(crossborder_bin "${root}")" "${setup_args[@]}"
  unset CROSSBORDER_DEFER_ACCESS_CARD
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

maybe_configure_nginx() {
  local root="$1"
  local port="$2"
  [[ "${INSTALL_PROFILE}" == "server" || "${INSTALL_PROFILE}" == "wwwroot" ]] || return 0
  [[ "$(uname -s)" == "Linux" ]] || return 0
  [[ "${CROSSBORDER_SKIP_NGINX:-}" == "1" ]] && return 0

  local do_nginx=0
  local install_nginx=0
  if [[ "${CROSSBORDER_NGINX:-}" == "1" ]]; then
    do_nginx=1
    install_nginx=1
  elif command -v nginx >/dev/null 2>&1; then
    do_nginx=1
  fi
  [[ "${do_nginx}" -eq 1 ]] || return 0

  echo "==> nginx reverse proxy (port 80 → panel :${port})"
  local py="${root}/.venv/bin/python"
  [[ -x "${py}" && -d "${root}/src" ]] || return 0
  PYTHONPATH="${root}/src" "${py}" -c "
from deploy.nginx_setup import setup_http_panel_proxy
r = setup_http_panel_proxy(upstream_port=${port}, install_nginx=${install_nginx})
for line in r.get('messages', []):
    print('   ', line)
for line in r.get('warnings', []):
    print('    warn:', line)
" 2>/dev/null || echo "    nginx: skipped (sudo may be required — see ${DOCS_INSTALL})"
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
  local cb
  cb="$(crossborder_bin "${root}")"
  export PATH="${HOME}/.local/bin:${PATH}"

  if [[ "${INSTALL_WAS_UPDATE}" -eq 1 ]]; then
    echo "==> restarting panel after update (port ${port}, log: ${log})"
    "${cb}" service restart 2>/dev/null || "${cb}" service start 2>/dev/null || true
  elif command -v lsof >/dev/null 2>&1 && lsof -i ":${port}" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "==> panel already listening on port ${port}"
    return 0
  else
    echo "==> starting panel on port ${port} (log: ${log})"
    "${cb}" service start 2>/dev/null || nohup "${cb}" serve --no-reload >>"${log}" 2>&1 &
  fi

  configure_linux_firewall "${port}" "${root}"
  local public_port
  public_port="$(env_val PANEL_PUBLIC_HTTP_PORT "${root}/.env")"
  if [[ "${public_port}" == "80" ]] || [[ -n "${CROSSBORDER_NGINX:-}" ]] || command -v nginx >/dev/null 2>&1; then
    configure_linux_firewall 80 "${root}"
  fi

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
  echo "    restart: crossborder service restart"
}

print_install_complete() {
  local root="$1"
  local port
  port="$(read_env_port "${root}")"
  local py="${root}/.venv/bin/python"

  if [[ -x "${py}" && -d "${root}/src" ]]; then
    cd "${root}"
    export PATH="${HOME}/.local/bin:${root}/bin:${PATH}"
    PYTHONPATH="${root}/src" "${py}" -c "
from pathlib import Path
from deploy.panel_access import build_access_from_env, print_install_access_summary

info = build_access_from_env(env_path=Path('.env'))
print_install_access_summary(
    info,
    install_dir='${root}',
    panel_port=${port},
    legacy_card=True,
    plain_card=True,
)
"
    echo "==> reload shell for crossborder CLI:  source ~/.bashrc"
    return 0
  fi

  echo ""
  echo "  Installation complete — see ${root}/.env for credentials"
  echo "  CLI: ${root}/bin/crossborder --help"
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
  [[ -f "${ROOT}/.env" ]] && INSTALL_WAS_UPDATE=1
  confirm_reinstall_update "${ROOT}"
  if is_existing_install "${ROOT}" && [[ -d "${ROOT}/.git" ]]; then
    INSTALL_WAS_UPDATE=1
    echo "==> updating ${ROOT} (existing install — .env and data preserved)"
    sync_to_origin "${ROOT}"
  fi
  prepare_server_prereqs
else
  prepare_server_prereqs
  prepare_vps_prereqs "${INSTALL_DIR}"
  prepare_wwwroot_install_access "${INSTALL_DIR}"
  confirm_reinstall_update "${INSTALL_DIR}"
  clone_or_update
  ROOT="${INSTALL_DIR}"
  finalize_vps_ownership "${ROOT}"
  # curl | bash may hit a stale raw.githubusercontent.com cache — always bootstrap from clone.
  if [[ "${CROSSBORDER_INSTALL_REEXEC:-}" != "1" && -f "${ROOT}/scripts/install.sh" ]]; then
    echo "==> re-exec install from ${ROOT}/scripts/install.sh (matches cloned repo)"
    exec env CROSSBORDER_INSTALL_REEXEC=1 CROSSBORDER_CONFIRMED="${CROSSBORDER_CONFIRMED:-1}" bash "${ROOT}/scripts/install.sh"
  fi
fi

# Re-exec fallback when install was piped (BASH_SOURCE not always "-" on all platforms).
if [[ "${CROSSBORDER_INSTALL_REEXEC:-}" != "1" && -f "${ROOT}/scripts/install.sh" ]]; then
  case "${BASH_SOURCE[0]:-}" in
    -|bash|/dev/fd/*|/proc/self/fd/*)
      echo "==> re-exec install from ${ROOT}/scripts/install.sh (matches cloned repo)"
      exec env CROSSBORDER_INSTALL_REEXEC=1 CROSSBORDER_CONFIRMED="${CROSSBORDER_CONFIRMED:-1}" bash "${ROOT}/scripts/install.sh"
      ;;
  esac
fi

ensure_uv
run_bootstrap "${ROOT}"
install_global_cli "${ROOT}"
ensure_shell_path "${ROOT}"
link_system_cli "${ROOT}"
verify_global_cli "${ROOT}"
register_autostart "${ROOT}"
_panel_port="$(read_env_port "${ROOT}")"
maybe_configure_nginx "${ROOT}" "${_panel_port}"
maybe_start_panel "${ROOT}"
print_install_complete "${ROOT}"
