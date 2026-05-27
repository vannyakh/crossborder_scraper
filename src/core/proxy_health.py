"""Proxy egress checks for the panel."""

from __future__ import annotations

from typing import Any, Literal

import httpx

from config import Settings
from core.proxy import ProxyConfig, proxy_pool_for_settings

ProbeMode = Literal["direct", "single", "pool", "vpn"]


def resolve_proxy_mode(settings: Settings) -> ProbeMode:
    list_path = settings.proxy_list_path
    if list_path and list_path.exists():
        from core.proxy import ProxyPool

        count = ProxyPool.from_file(list_path).size
        if count > 1:
            return "pool"
        if count == 1:
            return "single"
    if settings.vpn_enabled and settings.vpn_local_endpoint:
        return "vpn"
    if settings.proxy_server:
        return "single"
    return "direct"


def proxy_status(settings: Settings) -> dict[str, Any]:
    pool = proxy_pool_for_settings(settings)
    list_path = settings.proxy_list_path
    list_exists = bool(list_path and list_path.exists())
    list_count = 0
    if list_exists and list_path:
        from core.proxy import ProxyPool

        list_count = ProxyPool.from_file(list_path).size

    mode = resolve_proxy_mode(settings)
    return {
        "mode": mode,
        "pool_size": pool.size,
        "rotation": settings.proxy_rotation_strategy,
        "vpn_enabled": settings.vpn_enabled,
        "vpn_mode": settings.vpn_mode,
        "proxy_server_set": bool(settings.proxy_server),
        "proxy_list_path": str(list_path) if list_path else None,
        "list_exists": list_exists,
        "list_count": list_count,
        "vpn_endpoint_set": bool(settings.vpn_local_endpoint),
        "vpn_config_path": str(settings.vpn_config_path) if settings.vpn_config_path else None,
    }


def _httpx_proxy_url(cfg: ProxyConfig) -> str:
    if cfg.username or cfg.password:
        scheme, rest = cfg.server.split("://", 1)
        user = cfg.username or ""
        password = cfg.password or ""
        return f"{scheme}://{user}:{password}@{rest}"
    return cfg.server


async def _fetch_ip(*, proxy_url: str | None = None, timeout: float = 12.0) -> str:
    async with httpx.AsyncClient(
        proxy=proxy_url,
        timeout=timeout,
        follow_redirects=True,
    ) as client:
        res = await client.get("https://api.ipify.org?format=json")
        res.raise_for_status()
        data = res.json()
        ip = data.get("ip")
        if not isinstance(ip, str) or not ip:
            raise RuntimeError("Could not read public IP from probe")
        return ip


async def test_proxy_egress(settings: Settings) -> dict[str, Any]:
    mode = resolve_proxy_mode(settings)
    pool = proxy_pool_for_settings(settings)
    proxy_cfg = pool.get(0) if pool.size else None
    proxy_url = _httpx_proxy_url(proxy_cfg) if proxy_cfg else None

    try:
        direct_ip = await _fetch_ip(proxy_url=None)
    except Exception as exc:
        return {
            "ok": False,
            "message": f"Direct egress check failed: {exc}",
            "direct_ip": None,
            "exit_ip": None,
            "proxied": False,
            "mode": mode,
        }

    if not proxy_url:
        return {
            "ok": True,
            "message": "No proxy configured — scrape traffic uses the server IP directly.",
            "direct_ip": direct_ip,
            "exit_ip": direct_ip,
            "proxied": False,
            "mode": mode,
        }

    try:
        exit_ip = await _fetch_ip(proxy_url=proxy_url)
    except Exception as exc:
        return {
            "ok": False,
            "message": f"Proxy egress check failed: {exc}",
            "direct_ip": direct_ip,
            "exit_ip": None,
            "proxied": False,
            "mode": mode,
        }

    hidden = exit_ip != direct_ip
    if hidden:
        message = f"Egress routed ({mode}) — exit IP differs from server IP."
    else:
        message = "Proxy reachable but exit IP matches server — verify VPN/proxy routing."

    return {
        "ok": hidden,
        "message": message,
        "direct_ip": direct_ip,
        "exit_ip": exit_ip,
        "proxied": hidden,
        "mode": mode,
    }
