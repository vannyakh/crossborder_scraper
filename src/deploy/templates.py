"""Deployment templates (systemd, launchd, Windows task, nginx) for self-hosted installs."""

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
Description=Cross-Border panel (FastAPI + gateway agent)
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
    if ssl:
        listen = (
            "listen 443 ssl http2;\n"
            "    ssl_certificate     /path/to/fullchain.pem;\n"
            "    ssl_certificate_key /path/to/privkey.pem;"
        )
    else:
        listen = "listen 80;"
    return f"""# Reverse proxy for Cross-Border panel (place in sites-enabled)
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


def launchd_plist(
    *,
    working_directory: str | None = None,
    port: int = DEFAULT_PANEL_PORT,
    label: str = "com.crossborder.panel",
) -> str:
    """macOS LaunchAgent plist — auto-starts panel on user login, keeps it alive."""
    wd = working_directory or str(repo_root())
    venv_py = f"{wd}/.venv/bin/python"
    log = f"{wd}/data/panel.log"
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{venv_py}</string>
        <string>-m</string>
        <string>server</string>
    </array>
    <key>WorkingDirectory</key>
    <string>{wd}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PYTHONPATH</key>
        <string>{wd}/src</string>
        <key>UVICORN_RELOAD</key>
        <string>0</string>
        <key>PANEL_PORT</key>
        <string>{port}</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>{log}</string>
    <key>StandardErrorPath</key>
    <string>{log}</string>
    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>
"""


def windows_task_cmd(
    *,
    working_directory: str | None = None,
    task_name: str = "CrossBorder Panel",
) -> str:
    """Windows batch script registered via Task Scheduler on user logon."""
    wd = working_directory or str(repo_root())
    cb = f"{wd}\\.venv\\Scripts\\crossborder.exe"
    log = f"{wd}\\data\\panel.log"
    return f"""@echo off
:: Cross-Border panel — auto-start (Task Scheduler / Startup)
setlocal
cd /d "{wd}"
set PYTHONPATH={wd}\\src
set UVICORN_RELOAD=0
if not exist "{wd}\\data" mkdir "{wd}\\data"
start "" /b "{cb}" serve --no-reload >> "{log}" 2>&1
endlocal
"""


def write_template(path: Path, content: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path
