"""UFW port rule management for VPS host firewall."""

from __future__ import annotations

import hashlib
import os
import re
import shutil
import subprocess
from typing import Any

from deploy.firewall import get_listen_addresses
from deploy.network_access import _can_sudo, _exec_firewall, ufw_status

_NUMBERED_RULE_RE = re.compile(
    r"^\[\s*(\d+)\]\s+(.+?)\s+(ALLOW|DENY|REJECT)\s+(IN|OUT|INOUT)\s+(.+?)\s*$",
    re.IGNORECASE,
)


def ufw_installed() -> bool:
    return shutil.which("ufw") is not None


def can_manage_ufw() -> bool:
    if not ufw_installed():
        return False
    return os.geteuid() == 0 or _can_sudo(["ufw", "status"])


def get_ufw_summary(panel_port: int = 8787) -> dict[str, Any]:
    base = ufw_status(panel_port)
    if not ufw_installed():
        return {
            **base,
            "active": False,
            "installed": False,
            "can_manage": False,
            "port_rule_count": 0,
            "inbound_rule_count": 0,
            "outbound_rule_count": 0,
            "icmp_blocked": False,
        }
    numbered = _run_ufw(["status", "numbered"])
    text = (numbered.stdout or "") + (numbered.stderr or "")
    active = "Status: active" in text
    rules = parse_numbered_rules(text)
    inbound = [r for r in rules if r.get("direction") == "inbound"]
    outbound = [r for r in rules if r.get("direction") == "outbound"]
    icmp_blocked = _icmp_blocked(text)
    return {
        **base,
        "active": active,
        "installed": ufw_installed(),
        "can_manage": can_manage_ufw(),
        "port_rule_count": len(rules),
        "inbound_rule_count": len(inbound),
        "outbound_rule_count": len(outbound),
        "icmp_blocked": icmp_blocked,
    }


def _icmp_blocked(status_text: str) -> bool:
    lower = status_text.lower()
    return "icmp" in lower and "deny" in lower


def _run_ufw(args: list[str], *, timeout: int = 30) -> subprocess.CompletedProcess[str]:
    if not ufw_installed():
        empty = subprocess.CompletedProcess(
            args=["ufw", *args], returncode=127, stdout="", stderr="ufw not installed"
        )
        return empty
    return _exec_firewall(["ufw", *args])


def parse_numbered_rules(text: str) -> list[dict[str, Any]]:
    rules: list[dict[str, Any]] = []
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("["):
            continue
        match = _NUMBERED_RULE_RE.match(line)
        if not match:
            continue
        number = int(match.group(1))
        target = match.group(2).strip()
        action = match.group(3).lower()
        direction_raw = match.group(4).upper()
        source = match.group(5).strip()
        if source.lower() in ("anywhere", "anywhere (v6)"):
            source = "0.0.0.0/0" if "(v6)" not in source.lower() else "::/0"

        protocol, port = _parse_target(target)
        direction = "outbound" if direction_raw == "OUT" else "inbound"
        sig = rule_signature(
            protocol=protocol,
            port=port,
            source=source,
            action=action,
            direction=direction,
        )
        listening = _port_listening(port, protocol)
        rules.append(
            {
                "ufw_number": number,
                "signature": sig,
                "protocol": protocol,
                "port": port,
                "source": source,
                "action": action,
                "direction": direction,
                "target": target,
                "listening": listening,
                "ipv6": "(v6)" in line.lower() or target.endswith("(v6)"),
            }
        )
    return rules


def _parse_target(target: str) -> tuple[str, str]:
    target = target.replace("(v6)", "").strip()
    if "/" in target and not target.startswith("/"):
        parts = target.split("/", 1)
        if parts[0].lower() in ("tcp", "udp", "any"):
            return parts[0].lower(), parts[1]
    if target.lower() in ("any", "all"):
        return "any", "any"
    return "tcp", target


def _port_listening(port: str, protocol: str) -> bool | None:
    if not port or port == "any" or "," in port or "-" in port:
        return None
    try:
        p = int(port.split("/")[0])
    except ValueError:
        return None
    if protocol not in ("tcp", "any"):
        return None
    addrs = get_listen_addresses(p)
    return bool(addrs)


def rule_signature(
    *,
    protocol: str,
    port: str,
    source: str,
    action: str,
    direction: str,
) -> str:
    raw = f"{direction}|{action}|{protocol}|{port}|{source}".lower()
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def enable_ufw(*, default_deny: bool = True) -> tuple[bool, str]:
    if not can_manage_ufw():
        return False, "ufw management requires root or passwordless sudo"
    if default_deny:
        for cmd in (
            ["default", "deny", "incoming"],
            ["default", "allow", "outgoing"],
        ):
            result = _run_ufw(cmd)
            if result.returncode != 0:
                return False, (result.stderr or result.stdout or "default policy failed").strip()
    result = _run_ufw(["--force", "enable"])
    if result.returncode != 0:
        return False, (result.stderr or result.stdout or "enable failed").strip()
    _run_ufw(["reload"])
    return True, "ufw enabled"


def disable_ufw() -> tuple[bool, str]:
    if not can_manage_ufw():
        return False, "ufw management requires root or passwordless sudo"
    result = _run_ufw(["disable"])
    ok = result.returncode == 0
    return ok, (result.stderr or result.stdout or ("disabled" if ok else "disable failed")).strip()


def set_icmp_block(*, block: bool) -> tuple[bool, str]:
    if not can_manage_ufw():
        return False, "ufw management requires root or passwordless sudo"
    if block:
        result = _run_ufw(["deny", "proto", "icmp"])
    else:
        result = _run_ufw(["delete", "deny", "proto", "icmp"])
        if result.returncode != 0:
            result = _run_ufw(["allow", "proto", "icmp"])
    ok = result.returncode == 0
    msg = (result.stderr or result.stdout or ("icmp updated" if ok else "icmp rule failed")).strip()
    if ok:
        _run_ufw(["reload"])
    return ok, msg


def add_port_rule(
    *,
    protocol: str = "tcp",
    port: str,
    source: str = "0.0.0.0/0",
    action: str = "allow",
    direction: str = "inbound",
    remark: str = "",
) -> tuple[bool, str]:
    if not can_manage_ufw():
        return False, "ufw management requires root or passwordless sudo"
    port = port.strip()
    if not port:
        return False, "port is required"

    proto = protocol.lower()
    if proto not in ("tcp", "udp", "any"):
        proto = "tcp"

    act = "allow" if action.lower() == "allow" else "deny"
    port_spec = f"{port}/{proto}" if proto != "any" else port
    src = source.strip() or "0.0.0.0/0"

    cmd: list[str] = [act]
    if direction == "outbound":
        cmd.append("out")
    if src not in ("0.0.0.0/0", "any", "Anywhere"):
        cmd.extend(["from", src])
    cmd.append(port_spec)
    if remark.strip():
        cmd.extend(["comment", remark.strip()[:120]])

    result = _run_ufw(cmd, timeout=60)
    ok = result.returncode == 0
    if ok:
        _run_ufw(["reload"])
    return ok, (result.stderr or result.stdout or ("rule added" if ok else "add failed")).strip()


def delete_rule_by_number(number: int) -> tuple[bool, str]:
    if not can_manage_ufw():
        return False, "ufw management requires root or passwordless sudo"
    result = _run_ufw(["--force", "delete", str(number)])
    ok = result.returncode == 0
    if ok:
        _run_ufw(["reload"])
    return ok, (result.stderr or result.stdout or ("deleted" if ok else "delete failed")).strip()


def install_ufw_package() -> tuple[bool, list[str]]:
    """Install ufw via apt when missing (Linux only)."""
    messages: list[str] = []
    if ufw_installed():
        return True, ["ufw already installed"]
    if not shutil.which("apt-get"):
        return False, ["ufw not installed — install ufw manually or use apt-based Linux"]
    cmd = [
        "sh",
        "-c",
        "export DEBIAN_FRONTEND=noninteractive && apt-get update -qq && apt-get install -y -qq ufw",
    ]
    if os.geteuid() != 0:
        if not _can_sudo(["apt-get", "update"]):
            return False, ["needs root or sudo to install ufw"]
        proc = subprocess.run(
            ["sudo", "-n", *cmd], capture_output=True, text=True, timeout=300, check=False
        )
    else:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300, check=False)
    out = (proc.stdout or proc.stderr or "").strip()
    if out:
        messages.extend(out.splitlines()[-5:])
    if proc.returncode != 0:
        return False, messages + [f"apt install ufw failed (exit {proc.returncode})"]
    return ufw_installed(), messages + ["ufw installed"]
