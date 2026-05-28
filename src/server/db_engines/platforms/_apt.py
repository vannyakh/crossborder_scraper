"""Shared apt-cache helpers for native version probing."""

from __future__ import annotations

import shutil
import subprocess


def run_cmd(cmd: list[str], *, timeout: int = 8) -> str:
    if not cmd or not shutil.which(cmd[0]):
        return ""
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False)
    return (proc.stdout or proc.stderr or "").strip()


def madison_versions(package: str) -> list[str]:
    out = run_cmd(["apt-cache", "madison", package])
    if not out:
        return []
    versions: list[str] = []
    for line in out.splitlines():
        parts = line.split("|")
        if len(parts) < 3:
            continue
        ver = parts[2].strip().split()[0] if parts[2].strip() else ""
        if ver:
            versions.append(ver)
    return versions


def search_names(pattern: str) -> list[str]:
    out = run_cmd(["apt-cache", "search", "--names-only", pattern])
    if not out:
        return []
    return [line.split()[0] for line in out.splitlines() if line.strip()]
