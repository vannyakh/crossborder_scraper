"""Reachability probes for store plugins (TCP + lightweight protocol checks)."""

from __future__ import annotations

import socket
from typing import Any

from server.app_store.catalog import StorePluginDefinition


def _tcp_reachable(host: str, port: int, timeout: float = 3.0) -> tuple[bool, str]:
    try:
        with socket.create_connection((host, int(port)), timeout=timeout):
            return True, "port open"
    except OSError as exc:
        return False, str(exc)


def _redis_ping(
    host: str, port: int, password: str | None, timeout: float = 3.0
) -> tuple[bool, str]:
    ok, msg = _tcp_reachable(host, port, timeout)
    if not ok:
        return False, msg
    try:
        with socket.create_connection((host, int(port)), timeout=timeout) as sock:
            sock.settimeout(timeout)
            if password:
                auth = f"*2\r\n$4\r\nAUTH\r\n${len(password)}\r\n{password}\r\n"
                sock.sendall(auth.encode())
                sock.recv(4096)
            sock.sendall(b"*1\r\n$4\r\nPING\r\n")
            data = sock.recv(4096).decode(errors="replace")
            if "PONG" in data.upper() or "+PONG" in data:
                return True, "PONG"
            if "NOAUTH" in data:
                return False, "authentication required"
            return False, data[:120] or "unexpected response"
    except OSError as exc:
        return False, str(exc)


def probe_plugin(plugin: StorePluginDefinition, config: dict[str, Any]) -> dict[str, Any]:
    host = str(config.get("host") or "127.0.0.1")
    port = int(config.get("port") or plugin.default_port)
    password = config.get("password")
    username = config.get("username")

    if plugin.id == "redis":
        ok, message = _redis_ping(host, port, str(password) if password else None)
        return {"ok": ok, "message": message, "host": host, "port": port}

    if plugin.id in {"postgresql", "mysql", "mongodb", "memcached", "rabbitmq"}:
        ok, message = _tcp_reachable(host, port)
        detail = f"{plugin.name} port reachable" if ok else message
        if plugin.id == "rabbitmq" and ok:
            mgmt = config.get("management_port")
            if mgmt:
                mgmt_ok, mgmt_msg = _tcp_reachable(host, int(mgmt))
                detail = f"AMQP OK; management {'up' if mgmt_ok else mgmt_msg}"
        return {
            "ok": ok,
            "message": detail,
            "host": host,
            "port": port,
            "username": username,
        }

    ok, message = _tcp_reachable(host, port)
    return {"ok": ok, "message": message, "host": host, "port": port}
