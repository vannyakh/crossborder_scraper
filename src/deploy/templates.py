"""Deployment templates (systemd, nginx) — aaPanel / VPS style."""

from __future__ import annotations

from pathlib import Path

from core.paths import repo_root
from deploy.network import DEFAULT_PANEL_PORT


def systemd_unit(
    *,
    user: str = "www-data",
    working_directory: str | None = None,
    port: int = DEFAULT_PANEL_PORT,
) -> str:
    wd = working_directory or str(repo_root())
    venv_py = f"{wd}/.venv/bin/python"
    exec_start = (
        f"{venv_py} -m uvicorn server.app:app --host 0.0.0.0 --port {port}"
        if Path(f"{wd}/.venv/bin/python").exists()
        else f"/usr/bin/env python3 -m uvicorn server.app:app --host 0.0.0.0 --port {port}"
    )
    return f"""[Unit]
Description=Crossborder Scraper Panel (FastAPI + gateway agent)
After=network.target

[Service]
Type=simple
User={user}
WorkingDirectory={wd}
Environment=PYTHONPATH={wd}/src
Environment=UVICORN_RELOAD=0
ExecStart={exec_start}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
"""


def nginx_site(
    *,
    server_name: str = "_",
    upstream_port: int = DEFAULT_PANEL_PORT,
    ssl: bool = False,
) -> str:
    listen = "listen 443 ssl http2;\n    ssl_certificate     /path/to/fullchain.pem;\n    ssl_certificate_key /path/to/privkey.pem;" if ssl else "listen 80;"
    return f"""# Reverse proxy for Crossborder Scraper panel (place in sites-enabled)
server {{
    {listen}
    server_name {server_name};

    client_max_body_size 32m;

    location / {{
        proxy_pass http://127.0.0.1:{upstream_port};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }}
}}
"""


def write_template(path: Path, content: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path
