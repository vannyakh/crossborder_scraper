"""Panel security configuration — entrance path, access key, domain, credentials."""

from __future__ import annotations

from typing import Any

from config import get_settings
from config.credentials import upsert_env_file
from core.paths import env_file_path
from core.timezone import build_timezone_info, list_timezone_options
from deploy.network_access import build_network_access_status
from deploy.panel_security import (
    build_entrance_access_url,
    build_entrance_url,
    build_login_url,
    generate_access_key,
    generate_entry_path,
    normalize_entry_path,
)
from server.core.panel_bind import configure_panel_bind, get_panel_bind_info


def _host_for_urls(settings: Any, bind: dict[str, Any]) -> str:
    ext = (settings.panel_external_host or "").strip()
    if ext:
        return ext
    return str(bind.get("access_ip") or "127.0.0.1")


def build_panel_security_status(*, port: int | None = None) -> dict[str, Any]:
    settings = get_settings()
    chosen_port = port if port is not None else settings.panel_port
    entry = normalize_entry_path(settings.panel_entry_path)
    bind = get_panel_bind_info()
    host = _host_for_urls(settings, bind)
    public_port = settings.panel_public_http_port or chosen_port
    access_key = (settings.panel_access_key or "").strip() or None

    urls = {
        "entrance": build_entrance_url(host, public_port, entry) if entry else None,
        "entrance_access": (
            build_entrance_access_url(host, public_port, entry, access_key=access_key)
            if entry and access_key
            else None
        ),
        "login": build_login_url(host, public_port, entry, access_key=access_key)
        if entry
        else f"http://{host}:{chosen_port}/ui/login",
        "local_login": build_login_url("127.0.0.1", chosen_port, entry),
        "bare_host_note": (
            f"http://{host}/ui/login returns 404 — use entrance URL with access key"
            if entry
            else f"http://{host}:{chosen_port}/ui/ — standard panel URL"
        ),
    }

    return {
        "security_entrance_enabled": bool(entry),
        "entry_path": entry,
        "entry_path_display": f"/{entry}" if entry else None,
        "access_key_configured": bool(access_key),
        "panel_host": settings.panel_host,
        "panel_port": chosen_port,
        "external_host": settings.panel_external_host,
        "panel_username": settings.panel_username,
        "urls": urls,
        "network": build_network_access_status(port=chosen_port),
        "restart_required": False,
        "server_timezone": build_timezone_info(),
        "timezone_options": list_timezone_options(),
    }


class PanelSecurityService:
    def get_status(self, *, port: int | None = None) -> dict[str, Any]:
        return build_panel_security_status(port=port)

    def apply_update(
        self,
        *,
        external_host: str | None = None,
        entry_path: str | None = None,
        regenerate_entry: bool = False,
        regenerate_access_key: bool = False,
        enable_entrance: bool | None = None,
        username: str | None = None,
        password: str | None = None,
        timezone: str | None = None,
        actor: str = "admin",
    ) -> dict[str, Any]:
        from server.services.audit import log_operation

        env_path = env_file_path()
        updates: dict[str, str] = {}
        messages: list[str] = []
        restart_required = False
        new_access_key: str | None = None

        settings = get_settings()

        if external_host is not None:
            host = external_host.strip()
            if host.lower() in ("", "auto", "clear", "none"):
                updates["PANEL_EXTERNAL_HOST"] = ""
                messages.append("Cleared public domain / IP")
            else:
                updates["PANEL_EXTERNAL_HOST"] = host
                messages.append(f"Public host set to {host}")

        if enable_entrance is False:
            updates["PANEL_ENTRY_PATH"] = "off"
            updates["PANEL_SECURITY_ENTRANCE"] = "false"
            messages.append("Security entrance disabled — restart panel to apply")
            restart_required = True
        elif enable_entrance is True and not normalize_entry_path(settings.panel_entry_path):
            entry = generate_entry_path()
            key = generate_access_key()
            updates["PANEL_ENTRY_PATH"] = entry
            updates["PANEL_ACCESS_KEY"] = key
            updates["PANEL_SECURITY_ENTRANCE"] = "true"
            if not settings.panel_public_http_port:
                updates["PANEL_PUBLIC_HTTP_PORT"] = "80"
            new_access_key = key
            messages.append(f"Security entrance enabled at /{entry}/")
            restart_required = True
        elif enable_entrance is True:
            if not settings.panel_public_http_port:
                updates["PANEL_PUBLIC_HTTP_PORT"] = "80"
                messages.append("Public HTTP port set to 80 for nginx access URLs")
                restart_required = True

        if regenerate_entry:
            entry = generate_entry_path()
            updates["PANEL_ENTRY_PATH"] = entry
            updates["PANEL_SECURITY_ENTRANCE"] = "true"
            messages.append(f"New entrance path: /{entry}/")
            restart_required = True

        if entry_path is not None:
            normalized = normalize_entry_path(entry_path)
            if entry_path.strip().lower() in ("off", "false", "disabled", "-", "none"):
                updates["PANEL_ENTRY_PATH"] = "off"
                updates["PANEL_SECURITY_ENTRANCE"] = "false"
                messages.append("Security entrance disabled")
            elif normalized:
                updates["PANEL_ENTRY_PATH"] = normalized
                updates["PANEL_SECURITY_ENTRANCE"] = "true"
                messages.append(f"Entrance path set to /{normalized}/")
            else:
                raise ValueError("Entrance path must be 8 lowercase hex characters (e.g. a1b2c3d4)")
            restart_required = True

        if regenerate_access_key:
            key = generate_access_key()
            updates["PANEL_ACCESS_KEY"] = key
            new_access_key = key
            messages.append("Access key regenerated — update bookmarks")
            restart_required = True

        if username is not None:
            updates["PANEL_USERNAME"] = username.strip()
            messages.append("Panel username updated")

        if password is not None:
            updates["PANEL_PASSWORD"] = password
            messages.append("Panel password updated")

        if timezone is not None:
            from config.server_store import save_server_timezone
            from gateway.schedules_store import recalculate_schedule_next_runs

            validated = save_server_timezone(timezone)
            recalculated = recalculate_schedule_next_runs()
            messages.append(f"Server timezone set to {validated}")
            if recalculated:
                messages.append(f"Recalculated next run for {recalculated} schedule(s)")

        if updates:
            upsert_env_file(env_path, updates)
            configure_panel_bind()

        if not messages:
            messages.append("No changes")

        log_operation(
            user=actor,
            operation_type="Panel security",
            details="; ".join(messages),
        )

        status = build_panel_security_status()
        status["restart_required"] = restart_required
        return {
            "ok": True,
            "messages": messages,
            "access_key": new_access_key,
            "status": status,
            "restart_required": restart_required,
        }


def get_panel_security_service() -> PanelSecurityService:
    return PanelSecurityService()
