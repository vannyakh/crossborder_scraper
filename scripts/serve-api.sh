#!/usr/bin/env bash
# Run FastAPI panel API from repo root (with reload).
set -euo pipefail
# shellcheck source=_lib.sh
source "$(dirname "$0")/_lib.sh"

load_dotenv
export UVICORN_RELOAD="${UVICORN_RELOAD:-1}"

preferred="${PANEL_PORT:-8787}"
port="$(resolve_dev_panel_port)"
export PANEL_PORT="$port"

if [[ "$port" != "$preferred" ]]; then
  echo "⚠  Port ${preferred} in use (self-hosted panel?). Dev API → ${port}" >&2
  echo "   Stop background panel: crossborder service stop" >&2
  echo "   Or disable autostart: crossborder deploy autostart disable" >&2
fi

repo_python - <<PY
import os

from deploy.panel_access import build_access_from_env

port = int(os.environ.get("PANEL_PORT", "8787"))
info = build_access_from_env()
print(f"==> Cross-Border API (reload={os.environ.get('UVICORN_RELOAD', '1')}) on port {port}")
if info.security_entrance_enabled and info.login_local_url:
    print(f"    Panel login:  {info.login_local_url}")
    if info.entrance_access_url:
        print(f"    Bookmark:     {info.entrance_access_url}")
    print("    Bare /ui/ returns 404 while security entrance is enabled.")
elif info.local_url:
    print(f"    Panel UI:     {info.local_url}")
    if os.environ.get("UVICORN_RELOAD", "1") in ("1", "true", "yes"):
        print("    Dev mode: security entrance disabled (production-only).")
else:
    print(f"    Panel UI:     http://127.0.0.1:{port}/ui/")
PY

if command -v uv >/dev/null 2>&1; then
  exec uv run serve
fi

exec repo_python -m server
