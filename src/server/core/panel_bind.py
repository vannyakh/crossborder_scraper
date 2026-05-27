"""Panel TCP bind address exposed to the web UI (startup host/port + LAN IP)."""

from __future__ import annotations

import os
import socket
from dataclasses import dataclass
from typing import Any

from deploy.network import DEFAULT_PANEL_PORT

_DEFAULT_HOST = "0.0.0.0"
_DEFAULT_PORT = DEFAULT_PANEL_PORT

_info: PanelBindInfo | None = None


@dataclass(frozen=True)
class PanelBindInfo:
    bind_host: str
    bind_port: int
    access_ip: str
    access_port: int
    panel_path: str
    panel_url: str
    copy_text: str


def _detect_lan_ipv4() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"


def _resolve_access_ip(bind_host: str) -> str:
    host = (bind_host or _DEFAULT_HOST).strip()
    if host in ("127.0.0.1", "localhost"):
        return "127.0.0.1"
    if host in ("0.0.0.0", "::", "::0", ""):
        return _detect_lan_ipv4()
    if host.startswith("::ffff:"):
        return host.split("::ffff:", 1)[-1]
    return host


def configure_panel_bind(
    *,
    host: str | None = None,
    port: int | None = None,
    panel_path: str = "/ui/",
) -> PanelBindInfo:
    global _info
    if host is None or port is None:
        try:
            from config import get_settings

            settings = get_settings()
            host = host or settings.panel_host
            port = port or settings.panel_port
        except Exception:
            host = host or os.environ.get("PANEL_HOST", _DEFAULT_HOST)
            port = port or int(os.environ.get("PANEL_PORT", str(_DEFAULT_PORT)))

    bind_host = str(host)
    bind_port = int(port)
    access_ip = _resolve_access_ip(bind_host)
    path = panel_path if panel_path.endswith("/") else f"{panel_path}/"
    panel_url = f"http://{access_ip}:{bind_port}{path}"
    copy_text = f"{access_ip}:{bind_port}"
    _info = PanelBindInfo(
        bind_host=bind_host,
        bind_port=bind_port,
        access_ip=access_ip,
        access_port=bind_port,
        panel_path=path,
        panel_url=panel_url,
        copy_text=copy_text,
    )
    return _info


def get_panel_bind_info() -> dict[str, Any]:
    if _info is None:
        configure_panel_bind()
    assert _info is not None
    return {
        "bind_host": _info.bind_host,
        "bind_port": _info.bind_port,
        "access_ip": _info.access_ip,
        "access_port": _info.access_port,
        "panel_path": _info.panel_path,
        "panel_url": _info.panel_url,
        "copy_text": _info.copy_text,
    }
