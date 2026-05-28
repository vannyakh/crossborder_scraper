"""Host/port detection for panel access URLs."""

from __future__ import annotations

import socket
from dataclasses import dataclass

from deploy.panel_security import build_entrance_url, build_login_url, panel_ui_path

_AUTO_EXTERNAL = frozenset({"", "auto", "detect"})

# Default panel port (8787 avoids common conflicts with 8000/8080/3000 on dev machines)
DEFAULT_PANEL_PORT = 8787


@dataclass(frozen=True)
class PanelAccessInfo:
    bind_host: str
    port: int
    username: str
    password: str
    credentials_generated: bool
    env_path: str
    local_url: str
    login_local_url: str
    lan_ips: tuple[str, ...] = ()
    external_url: str | None = None
    login_external_url: str | None = None
    port_auto_adjusted: bool = False
    entry_path: str | None = None
    access_key: str | None = None

    @property
    def security_entrance_enabled(self) -> bool:
        return bool(self.entry_path)

    @property
    def primary_access_url(self) -> str:
        if self.lan_ips:
            return build_entrance_url(self.lan_ips[0], self.port, self.entry_path)
        return self.local_url

    @property
    def primary_login_url(self) -> str:
        if self.lan_ips:
            return build_login_url(
                self.lan_ips[0],
                self.port,
                self.entry_path,
                access_key=self.access_key if self.credentials_generated else None,
            )
        return self.login_local_url


def _url(host: str, port: int, path: str) -> str:
    return f"http://{host}:{port}{path}"


def detect_lan_ips() -> list[str]:
    """Collect non-loopback IPv4 addresses for this machine."""
    ips: list[str] = []
    primary = _primary_ip_via_route()
    if primary and primary not in ips:
        ips.append(primary)

    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            addr = info[4][0]
            if addr.startswith("127.") or addr in ips:
                continue
            ips.append(addr)
    except OSError:
        pass

    return ips


def _primary_ip_via_route() -> str | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        return None


def is_port_free(host: str, port: int) -> bool:
    probe_host = "127.0.0.1" if host in ("0.0.0.0", "::", "") else host
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind((probe_host, port))
            return True
    except OSError:
        return False


def pick_panel_port(
    preferred: int = DEFAULT_PANEL_PORT, *, max_tries: int = 20
) -> tuple[int, bool]:
    if is_port_free("0.0.0.0", preferred):
        return preferred, False
    for offset in range(1, max_tries):
        candidate = preferred + offset
        if is_port_free("0.0.0.0", candidate):
            return candidate, True
    return preferred, False


def normalize_bind_host(host: str | None) -> str:
    if not host or host.strip() in ("", "auto"):
        return "0.0.0.0"
    return host.strip()


def detect_public_ip(*, timeout: float = 4.0) -> str | None:
    """Best-effort public IPv4 (for access card / PANEL_EXTERNAL_HOST)."""
    try:
        import httpx
    except ImportError:
        return None

    for url in ("https://ifconfig.me/ip", "https://icanhazip.com"):
        try:
            with httpx.Client(timeout=timeout) as client:
                text = client.get(url).text.strip()
        except Exception:
            continue
        if text and "." in text and not text.startswith("<"):
            return text.split()[0]
    return None


def resolve_external_host(external: str | None) -> str | None:
    """Return host for public URLs; ``auto`` / empty triggers detection."""
    if external is None:
        return detect_public_ip()
    stripped = external.strip()
    if stripped.lower() in _AUTO_EXTERNAL:
        return detect_public_ip()
    return stripped


def build_panel_access_info(
    *,
    username: str,
    password: str,
    bind_host: str,
    port: int,
    credentials_generated: bool,
    env_path: str,
    port_auto_adjusted: bool = False,
    external_host: str | None = None,
    entry_path: str | None = None,
    access_key: str | None = None,
) -> PanelAccessInfo:
    bind = normalize_bind_host(bind_host)
    lan_ips = tuple(detect_lan_ips())
    local_host = "127.0.0.1"
    ui_path = panel_ui_path(entry_path)
    login_key = access_key if credentials_generated else None

    ext_url = login_ext = None
    if external_host and external_host not in ("127.0.0.1", "localhost"):
        host = external_host.strip()
        ext_url = build_entrance_url(host, port, entry_path)
        login_ext = build_login_url(host, port, entry_path, access_key=login_key)

    return PanelAccessInfo(
        bind_host=bind,
        port=port,
        username=username,
        password=password,
        credentials_generated=credentials_generated,
        env_path=env_path,
        local_url=_url(local_host, port, ui_path),
        login_local_url=build_login_url(local_host, port, entry_path, access_key=login_key),
        lan_ips=lan_ips,
        external_url=ext_url,
        login_external_url=login_ext,
        port_auto_adjusted=port_auto_adjusted,
        entry_path=entry_path,
        access_key=access_key if credentials_generated else None,
    )
