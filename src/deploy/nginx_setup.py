"""Host nginx reverse proxy + optional Let's Encrypt (TLS termination on the VPS)."""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

from deploy.network import DEFAULT_PANEL_PORT
from deploy.network_access import run_host_firewall_setup
from deploy.templates import nginx_site, write_template


def _run(cmd: list[str], *, timeout: int = 120) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def _sudo(cmd: list[str], *, timeout: int = 120) -> subprocess.CompletedProcess[str]:
    if os.geteuid() == 0:
        return _run(cmd, timeout=timeout)
    return _run(["sudo", "-n", *cmd], timeout=timeout)


def nginx_installed() -> bool:
    return shutil.which("nginx") is not None


def certbot_installed() -> bool:
    return shutil.which("certbot") is not None


def https_cloud_steps(*, domain: str) -> list[str]:
    return [
        f"Point DNS A record: {domain} → your server public IP",
        "Cloud security group: allow inbound TCP 80 and TCP 443",
        "Host firewall: crossborder deploy https opens ufw 80/443 when possible",
        f"Login after TLS: https://{domain}/ui/login",
    ]


def setup_https_reverse_proxy(
    server_name: str,
    *,
    upstream_port: int = DEFAULT_PANEL_PORT,
    certbot: bool = False,
    install_nginx: bool = True,
    output_path: Path | None = None,
) -> dict[str, Any]:
    """
    Write nginx site config, open 80/443 on host firewall, optionally run certbot.

    Panel stays on 127.0.0.1:upstream_port; nginx terminates TLS on 443.
    """
    messages: list[str] = []
    warnings: list[str] = []
    domain = server_name.strip()
    if not domain or domain in ("_", "localhost"):
        return {
            "ok": False,
            "messages": [],
            "warnings": ["Provide a domain: crossborder deploy https -n panel.example.com"],
        }

    if install_nginx and not nginx_installed():
        if shutil.which("apt-get"):
            apt = _sudo(["apt-get", "update", "-qq"])
            if apt.returncode == 0:
                ins = _sudo(["apt-get", "install", "-y", "-qq", "nginx"])
                if ins.returncode == 0:
                    messages.append("nginx: installed via apt")
                else:
                    warnings.append("nginx: apt install failed — install nginx manually")
            else:
                warnings.append("nginx: apt update failed")
        else:
            warnings.append("nginx: not installed — apt install nginx or use your host panel")

    if certbot and not certbot_installed() and shutil.which("apt-get"):
        apt = _sudo(["apt-get", "update", "-qq"])
        if apt.returncode == 0:
            ins = _sudo(
                ["apt-get", "install", "-y", "-qq", "certbot", "python3-certbot-nginx"],
            )
            if ins.returncode == 0:
                messages.append("certbot: installed via apt")
            else:
                warnings.append("certbot: apt install failed — install certbot manually")

    ssl = False
    if certbot and certbot_installed() and nginx_installed():
        # HTTP-only first — certbot --nginx adds TLS
        content = nginx_site(server_name=domain, upstream_port=upstream_port, ssl=False)
    elif certbot and not certbot_installed():
        warnings.append("certbot: not installed (sudo apt install certbot python3-certbot-nginx)")
        content = nginx_site(server_name=domain, upstream_port=upstream_port, ssl=False)
    else:
        ssl = True
        content = nginx_site(
            server_name=domain,
            upstream_port=upstream_port,
            ssl=True,
            redirect_http=certbot is False,
        )

    out = output_path or Path(f"/etc/nginx/sites-available/crossborder-{domain.replace('.', '-')}")
    if os.geteuid() == 0 or out.parent.exists():
        try:
            write_template(out, content)
            messages.append(f"nginx config: {out}")
            enabled = Path(f"/etc/nginx/sites-enabled/{out.name}")
            if out.parent == Path("/etc/nginx/sites-available") and not enabled.exists():
                _sudo(["ln", "-sf", str(out), str(enabled)])
                messages.append(f"nginx enabled: {enabled}")
            test = _sudo(["nginx", "-t"])
            if test.returncode == 0:
                _sudo(["systemctl", "reload", "nginx"])
                messages.append("nginx: reloaded")
            else:
                warnings.append(f"nginx -t failed: {(test.stderr or test.stdout or '').strip()}")
        except OSError as exc:
            fallback = Path.cwd() / "deploy" / f"nginx-{domain}.conf"
            write_template(fallback, content)
            messages.append(f"nginx config (local): {fallback}")
            warnings.append(f"Could not write {out}: {exc} — copy config and reload nginx")
    else:
        fallback = Path.cwd() / "deploy" / f"nginx-{domain}.conf"
        write_template(fallback, content)
        messages.append(f"nginx config (local): {fallback}")
        warnings.append("Run with sudo to install under /etc/nginx/sites-available")

    # Host firewall: 80/443 (+ keep panel port during migration)
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
            ssl = True
        else:
            err = (cb.stderr or cb.stdout or "").strip()
            warnings.append(f"certbot failed: {err or cb.returncode}")

    return {
        "ok": len(warnings) == 0 or bool(messages),
        "domain": domain,
        "upstream_port": upstream_port,
        "ssl": ssl,
        "messages": messages,
        "warnings": warnings,
        "cloud_steps": https_cloud_steps(domain=domain),
        "login_url": f"https://{domain}/ui/login" if ssl else f"http://{domain}/ui/login",
    }
