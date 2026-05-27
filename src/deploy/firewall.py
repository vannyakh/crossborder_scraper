"""Open panel port on Linux host firewalls; verify TCP listen binding."""

from __future__ import annotations

import socket
import subprocess
from typing import Any


def try_open_tcp_port(port: int) -> list[str]:
    """Best-effort ufw / firewalld rules. Returns human-readable status lines."""
    lines: list[str] = []
    if port < 1 or port > 65535:
        return lines

    # ufw
    try:
        status = subprocess.run(
            ["ufw", "status"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if status.returncode == 0 and "active" in (status.stdout or "").lower():
            allow = subprocess.run(
                ["ufw", "allow", f"{port}/tcp"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if allow.returncode == 0:
                subprocess.run(["ufw", "reload"], capture_output=True, timeout=10)
                lines.append(f"ufw: allowed {port}/tcp")
            else:
                lines.append(f"ufw: could not allow {port}/tcp ({allow.stderr or allow.stdout})")
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        pass

    # firewalld
    try:
        subprocess.run(
            ["firewall-cmd", "--permanent", f"--add-port={port}/tcp"],
            capture_output=True,
            timeout=15,
            check=True,
        )
        subprocess.run(["firewall-cmd", "--reload"], capture_output=True, timeout=15, check=True)
        lines.append(f"firewalld: allowed {port}/tcp")
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError):
        pass

    return lines


def get_listen_addresses(port: int) -> list[str]:
    """Return bind addresses listening on port (ss or netstat fallback)."""
    addrs: list[str] = []
    try:
        out = subprocess.run(
            ["ss", "-tlnH", f"sport = :{port}"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if out.returncode == 0:
            for line in (out.stdout or "").splitlines():
                parts = line.split()
                for token in parts:
                    if ":" in token and token.count(":") >= 1:
                        host = token.rsplit(":", 1)[0]
                        if host.startswith("[") and host.endswith("]"):
                            host = host[1:-1]
                        if host and host not in addrs:
                            addrs.append(host)
            if addrs:
                return addrs
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        pass

    try:
        out = subprocess.run(
            ["netstat", "-tln"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if out.returncode == 0:
            needle = f":{port}"
            for line in (out.stdout or "").splitlines():
                if needle not in line or "LISTEN" not in line.upper():
                    continue
                for token in line.split():
                    if needle in token:
                        host = token.rsplit(":", 1)[0]
                        if host == "*":
                            host = "0.0.0.0"
                        if host not in addrs:
                            addrs.append(host)
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        pass

    return addrs


def is_publicly_bound(port: int) -> bool:
    addrs = get_listen_addresses(port)
    if not addrs:
        return False
    public_ok = {"0.0.0.0", "*", "::", "::0", ""}
    return any(a in public_ok for a in addrs)


def probe_local_health(port: int, path: str = "/health") -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=2):
            pass
        import httpx

        with httpx.Client(timeout=3.0) as client:
            r = client.get(f"http://127.0.0.1:{port}{path}")
            return r.status_code == 200
    except Exception:
        return False


def vps_access_checklist(*, port: int, public_ip: str | None) -> list[str]:
    """Hints when LAN works but public IP does not."""
    lines = [
        f"Panel must listen on 0.0.0.0:{port} (check .env PANEL_HOST=0.0.0.0).",
        f"Open TCP {port} in your cloud provider security group (inbound rule).",
    ]
    if public_ip:
        lines.append(f"Test from your PC: curl -sI http://{public_ip}:{port}/health")
    lines.append(f"On the VPS: sudo ufw allow {port}/tcp  OR  use: crossborder deploy firewall")
    lines.append("Production: put nginx on :80/:443 → crossborder deploy nginx")
    return lines


def firewall_status_dict(port: int) -> dict[str, Any]:
    return {
        "port": port,
        "listening": get_listen_addresses(port),
        "public_bind": is_publicly_bound(port),
        "local_health": probe_local_health(port),
    }
