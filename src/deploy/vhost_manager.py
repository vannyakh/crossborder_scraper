"""nginx virtual host management for VPS reverse-proxy sites."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

from deploy.firewall import probe_local_health
from deploy.network import DEFAULT_PANEL_PORT
from deploy.network_access import _can_sudo, run_host_firewall_setup
from deploy.nginx_setup import certbot_installed, nginx_installed
from deploy.templates import nginx_site, write_template

SITES_AVAILABLE = Path("/etc/nginx/sites-available")
SITES_ENABLED = Path("/etc/nginx/sites-enabled")

_SERVER_NAME_RE = re.compile(r"server_name\s+([^;]+);")
_LISTEN_RE = re.compile(r"listen\s+([^;]+);", re.IGNORECASE)
_PROXY_PASS_RE = re.compile(r"proxy_pass\s+http://127\.0\.0\.1:(\d+)")
_SSL_CERT_RE = re.compile(r"ssl_certificate\s+([^;]+);")


def _run(cmd: list[str], *, timeout: int = 120) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def _sudo(cmd: list[str], *, timeout: int = 120) -> subprocess.CompletedProcess[str]:
    if os.geteuid() == 0:
        return _run(cmd, timeout=timeout)
    if _can_sudo(cmd):
        return _run(["sudo", "-n", *cmd], timeout=timeout)
    return _run(cmd, timeout=timeout)


def can_manage_nginx() -> bool:
    if not nginx_installed():
        return False
    return os.geteuid() == 0 or _can_sudo(["nginx", "-t"])


def site_slug(domain: str) -> str:
    return domain.strip().lower().replace(".", "-")


def config_filename(domain: str, *, prefix: str = "crossborder") -> str:
    return f"{prefix}-{site_slug(domain)}"


def config_path_for_domain(domain: str) -> Path:
    return SITES_AVAILABLE / config_filename(domain)


def parse_site_file(path: Path) -> dict[str, Any]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return {
            "id": path.stem,
            "filename": path.name,
            "config_path": str(path),
            "server_names": [],
            "listen_ports": [],
            "upstream_port": None,
            "ssl": False,
            "managed": path.name.startswith("crossborder-"),
        }

    server_names = [
        part.strip()
        for match in _SERVER_NAME_RE.findall(text)
        for part in match.split()
        if part.strip() and part.strip() not in ("_",)
    ]
    listen_ports = [m.strip() for m in _LISTEN_RE.findall(text)]
    upstream_match = _PROXY_PASS_RE.search(text)
    upstream_port = int(upstream_match.group(1)) if upstream_match else None
    ssl = bool(_SSL_CERT_RE.search(text)) or any("ssl" in port for port in listen_ports)

    return {
        "id": path.stem,
        "filename": path.name,
        "config_path": str(path),
        "server_names": list(dict.fromkeys(server_names)),
        "listen_ports": listen_ports,
        "upstream_port": upstream_port,
        "ssl": ssl,
        "managed": path.name.startswith("crossborder-"),
    }


def list_site_files() -> list[Path]:
    if not SITES_AVAILABLE.is_dir():
        return []
    return sorted(
        p for p in SITES_AVAILABLE.iterdir() if p.is_file() or (p.is_symlink() and p.exists())
    )


def site_is_enabled(filename: str) -> bool:
    return (SITES_ENABLED / filename).exists()


def upstream_healthy(port: int | None) -> bool | None:
    if port is None:
        return None
    return probe_local_health(port)


def list_sites() -> list[dict[str, Any]]:
    sites: list[dict[str, Any]] = []
    for path in list_site_files():
        info = parse_site_file(path)
        info["enabled"] = site_is_enabled(path.name)
        info["upstream_healthy"] = upstream_healthy(info.get("upstream_port"))
        sites.append(info)
    return sites


def install_nginx_package() -> tuple[bool, list[str]]:
    messages: list[str] = []
    if nginx_installed():
        messages.append("nginx: already installed")
        return True, messages
    if not shutil.which("apt-get"):
        return False, ["nginx: apt-get not available — install nginx manually"]
    apt = _sudo(["apt-get", "update", "-qq"])
    if apt.returncode != 0:
        return False, ["nginx: apt update failed"]
    ins = _sudo(["apt-get", "install", "-y", "-qq", "nginx"])
    if ins.returncode != 0:
        return False, ["nginx: apt install failed"]
    messages.append("nginx: installed via apt")
    return True, messages


def write_site_config(
    domain: str,
    *,
    upstream_port: int = DEFAULT_PANEL_PORT,
    ssl: bool = False,
    redirect_http: bool = True,
    output_path: Path | None = None,
) -> tuple[Path, list[str], list[str]]:
    """Write nginx site config and enable it when running as root/sudo."""
    messages: list[str] = []
    warnings: list[str] = []
    content = nginx_site(
        server_name=domain.strip(),
        upstream_port=upstream_port,
        ssl=ssl,
        redirect_http=redirect_http,
    )
    out = output_path or config_path_for_domain(domain)

    if os.geteuid() == 0 or out.parent.exists():
        try:
            write_template(out, content)
            messages.append(f"nginx config: {out}")
            enabled = SITES_ENABLED / out.name
            if out.parent == SITES_AVAILABLE and not enabled.exists():
                _sudo(["ln", "-sf", str(out), str(enabled)])
                messages.append(f"nginx enabled: {enabled}")
        except OSError as exc:
            fallback = Path.cwd() / "deploy" / f"nginx-{domain}.conf"
            write_template(fallback, content)
            messages.append(f"nginx config (local): {fallback}")
            warnings.append(f"Could not write {out}: {exc}")
            out = fallback
    else:
        fallback = Path.cwd() / "deploy" / f"nginx-{domain}.conf"
        write_template(fallback, content)
        messages.append(f"nginx config (local): {fallback}")
        warnings.append("Run with sudo to install under /etc/nginx/sites-available")
        out = fallback

    return out, messages, warnings


def nginx_test() -> tuple[bool, str]:
    proc = _sudo(["nginx", "-t"])
    text = (proc.stderr or proc.stdout or "").strip()
    return proc.returncode == 0, text or ("ok" if proc.returncode == 0 else "nginx -t failed")


def nginx_reload() -> tuple[bool, str]:
    test_ok, test_msg = nginx_test()
    if not test_ok:
        return False, test_msg
    proc = _sudo(["systemctl", "reload", "nginx"])
    if proc.returncode != 0:
        proc = _sudo(["nginx", "-s", "reload"])
    text = (proc.stderr or proc.stdout or "").strip()
    if proc.returncode == 0:
        return True, "nginx reloaded"
    return False, text or "nginx reload failed"


def set_site_enabled(filename: str, *, enabled: bool) -> tuple[bool, str]:
    available = SITES_AVAILABLE / filename
    enabled_path = SITES_ENABLED / filename
    if not available.is_file():
        return False, f"site config not found: {filename}"
    if enabled:
        if enabled_path.exists():
            return True, "site already enabled"
        proc = _sudo(["ln", "-sf", str(available), str(enabled_path)])
    else:
        if not enabled_path.exists():
            return True, "site already disabled"
        proc = _sudo(["rm", "-f", str(enabled_path)])
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()
        return False, err or "failed to update site symlink"
    return True, "enabled" if enabled else "disabled"


def remove_site(filename: str) -> tuple[bool, str]:
    available = SITES_AVAILABLE / filename
    enabled_path = SITES_ENABLED / filename
    if enabled_path.exists():
        _sudo(["rm", "-f", str(enabled_path)])
    if available.is_file():
        proc = _sudo(["rm", "-f", str(available)])
        if proc.returncode != 0:
            err = (proc.stderr or proc.stdout or "").strip()
            return False, err or "failed to remove site config"
    return True, "site removed"


def create_reverse_proxy_site(
    server_name: str,
    *,
    upstream_port: int = DEFAULT_PANEL_PORT,
    certbot: bool = False,
    ssl: bool = False,
) -> dict[str, Any]:
    """Create or update a reverse-proxy vhost and optionally request TLS."""
    messages: list[str] = []
    warnings: list[str] = []
    domain = server_name.strip()
    if not domain or domain in ("_", "localhost"):
        return {
            "ok": False,
            "messages": [],
            "warnings": ["Provide a domain name"],
        }

    if certbot and not certbot_installed() and shutil.which("apt-get"):
        apt = _sudo(["apt-get", "update", "-qq"])
        if apt.returncode == 0:
            ins = _sudo(
                ["apt-get", "install", "-y", "-qq", "certbot", "python3-certbot-nginx"],
            )
            if ins.returncode == 0:
                messages.append("certbot: installed via apt")
            else:
                warnings.append("certbot: apt install failed")

    use_ssl = ssl
    redirect_http = not certbot
    if certbot and certbot_installed() and nginx_installed():
        use_ssl = False
        redirect_http = False
    elif certbot and not certbot_installed():
        warnings.append("certbot: not installed")
        use_ssl = False

    _, write_msgs, write_warns = write_site_config(
        domain,
        upstream_port=upstream_port,
        ssl=use_ssl,
        redirect_http=redirect_http,
    )
    messages.extend(write_msgs)
    warnings.extend(write_warns)

    for port in (80, 443, upstream_port):
        messages.extend(run_host_firewall_setup(port, enable_ufw=False))

    if certbot and certbot_installed() and nginx_installed() and os.geteuid() == 0:
        cb = _sudo(
            [
                "certbot",
                "--nginx",
                "-d",
                domain,
                "--non-interactive",
                "--agree-tos",
                "--register-unsafely-without-email",
                "--redirect",
            ],
            timeout=300,
        )
        if cb.returncode == 0:
            messages.append(f"certbot: TLS certificate issued for {domain}")
            use_ssl = True
        else:
            err = (cb.stderr or cb.stdout or "").strip()
            warnings.append(f"certbot failed: {err or cb.returncode}")

    if not upstream_healthy(upstream_port):
        warnings.append(
            f"upstream 127.0.0.1:{upstream_port} is not healthy — "
            "nginx will return 502 until the panel listens on that port"
        )

    test_ok, test_msg = nginx_test()
    if test_ok:
        reload_ok, reload_msg = nginx_reload()
        if reload_ok:
            messages.append(reload_msg)
        else:
            warnings.append(reload_msg)
    else:
        warnings.append(f"nginx -t failed: {test_msg}")

    site_id = config_filename(domain)
    return {
        "ok": bool(messages) and test_ok and upstream_healthy(upstream_port) is not False,
        "site_id": site_id,
        "domain": domain,
        "upstream_port": upstream_port,
        "ssl": use_ssl,
        "messages": messages,
        "warnings": warnings,
        "login_url": f"https://{domain}/ui/login" if use_ssl else f"http://{domain}/ui/login",
    }


def apply_certbot(domain: str) -> dict[str, Any]:
    messages: list[str] = []
    warnings: list[str] = []
    domain = domain.strip()
    if not domain:
        return {"ok": False, "messages": [], "warnings": ["domain required"]}
    if not certbot_installed():
        return {"ok": False, "messages": [], "warnings": ["certbot not installed"]}
    if not nginx_installed():
        return {"ok": False, "messages": [], "warnings": ["nginx not installed"]}
    if os.geteuid() != 0 and not _can_sudo(["certbot", "--version"]):
        return {
            "ok": False,
            "messages": [],
            "warnings": ["certbot requires root or passwordless sudo"],
        }

    cb = _sudo(
        [
            "certbot",
            "--nginx",
            "-d",
            domain,
            "--non-interactive",
            "--agree-tos",
            "--register-unsafely-without-email",
            "--redirect",
        ],
        timeout=300,
    )
    if cb.returncode == 0:
        messages.append(f"certbot: TLS certificate issued for {domain}")
        reload_ok, reload_msg = nginx_reload()
        if reload_ok:
            messages.append(reload_msg)
        else:
            warnings.append(reload_msg)
        return {"ok": True, "messages": messages, "warnings": warnings, "ssl": True}

    err = (cb.stderr or cb.stdout or "").strip()
    warnings.append(f"certbot failed: {err or cb.returncode}")
    return {"ok": False, "messages": messages, "warnings": warnings, "ssl": False}


def get_vhost_summary(*, panel_port: int = DEFAULT_PANEL_PORT) -> dict[str, Any]:
    sites = list_sites()
    enabled = [s for s in sites if s.get("enabled")]
    ssl_sites = [s for s in sites if s.get("ssl")]
    unhealthy = [
        s
        for s in enabled
        if s.get("upstream_healthy") is False and s.get("upstream_port") is not None
    ]
    return {
        "installed": nginx_installed(),
        "can_manage": can_manage_nginx(),
        "certbot_installed": certbot_installed(),
        "sites_available_dir": str(SITES_AVAILABLE),
        "sites_enabled_dir": str(SITES_ENABLED),
        "site_count": len(sites),
        "enabled_count": len(enabled),
        "ssl_count": len(ssl_sites),
        "unhealthy_count": len(unhealthy),
        "panel_port": panel_port,
        "panel_upstream_healthy": upstream_healthy(panel_port),
        "platform": os.name,
    }
