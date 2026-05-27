"""Host/port detection for panel access URLs (aaPanel-style setup output)."""

from __future__ import annotations

import socket
from dataclasses import dataclass, field


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

    @property
    def primary_access_url(self) -> str:
        if self.lan_ips:
            return f"http://{self.lan_ips[0]}:{self.port}/ui/"
        return self.local_url

    @property
    def primary_login_url(self) -> str:
        if self.lan_ips:
            return f"http://{self.lan_ips[0]}:{self.port}/ui/login"
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


def pick_panel_port(preferred: int = 8000, *, max_tries: int = 20) -> tuple[int, bool]:
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
) -> PanelAccessInfo:
    bind = normalize_bind_host(bind_host)
    lan_ips = tuple(detect_lan_ips())
    local_host = "127.0.0.1"

    ext_url = login_ext = None
    if external_host and external_host not in ("127.0.0.1", "localhost"):
        ext_url = _url(external_host.strip(), port, "/ui/")
        login_ext = _url(external_host.strip(), port, "/ui/login")

    return PanelAccessInfo(
        bind_host=bind,
        port=port,
        username=username,
        password=password,
        credentials_generated=credentials_generated,
        env_path=env_path,
        local_url=_url(local_host, port, "/ui/"),
        login_local_url=_url(local_host, port, "/ui/login"),
        lan_ips=lan_ips,
        external_url=ext_url,
        login_external_url=login_ext,
        port_auto_adjusted=port_auto_adjusted,
    )
