"""Host hardware metrics for the monitoring API."""

from __future__ import annotations

import platform
import re
import socket
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import psutil


def _safe_cpu_count_physical() -> int | None:
    try:
        return psutil.cpu_count(logical=False)
    except (SystemError, OSError, PermissionError):
        return None


def _format_host_uptime(seconds: float) -> str:
    total = max(0, int(seconds))
    days = total // 86400
    if days >= 1:
        return f"{days} Day(s)"
    hours = total // 3600
    if hours >= 1:
        return f"{hours} Hour(s)"
    minutes = total // 60
    if minutes >= 1:
        return f"{minutes} Minute(s)"
    return "< 1 Minute"


def _system_short_label(platform_str: str) -> str:
    low = platform_str.lower()
    if "ubuntu" in low:
        match = re.search(r"(\d{2})\.\d+", platform_str)
        return f"Ubuntu {match.group(1)}" if match else "Ubuntu"
    if "darwin" in low or "macos" in low:
        match = re.search(r"(\d{2})[._](\d+)", platform_str)
        if match:
            return f"macOS {match.group(1)}"
        return "macOS"
    if "windows" in low:
        match = re.search(r"(\d+)", platform_str)
        return f"Windows {match.group(1)}" if match else "Windows"
    name = platform.system()
    return name if name else "System"


def _system_detail(platform_str: str, python_version: str) -> str:
    return f"{platform_str} (Py{python_version})"


def _bytes_human(n: int) -> str:
    size = float(max(0, n))
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size < 1024.0 or unit == "TB":
            if unit == "B":
                return f"{int(size)}{unit}"
            return f"{size:.1f}{unit}"
        size /= 1024.0
    return f"{size:.1f}PB"


def collect_hardware(*, disk_path: Path | str | None = None) -> dict[str, Any]:
    path = Path(disk_path) if disk_path else Path.cwd()
    if not path.exists():
        path = path.parent if path.parent != path else Path("/")

    try:
        cpu_count = psutil.cpu_count(logical=True) or 1
    except (SystemError, OSError, PermissionError):
        cpu_count = 1
    per_core: list[float] = []
    try:
        raw_per_core = psutil.cpu_percent(interval=0.1, percpu=True)
        per_core = [round(float(p), 1) for p in raw_per_core]
        cpu_percent = sum(per_core) / len(per_core) if per_core else 0.0
    except (SystemError, OSError, PermissionError):
        cpu_percent = 0.0
    try:
        vm = psutil.virtual_memory()
    except (SystemError, OSError, PermissionError):
        vm = type("VM", (), {"used": 0, "total": 1, "available": 1, "percent": 0.0})()
    try:
        disk = psutil.disk_usage(str(path))
    except (SystemError, OSError, PermissionError):
        disk = type("Disk", (), {"used": 0, "total": 1, "free": 1})()

    load_1 = load_5 = load_15 = 0.0
    try:
        load_1, load_5, load_15 = psutil.getloadavg()
    except (AttributeError, OSError):
        load_1 = cpu_percent / 100.0 * cpu_count

    load_percent = min(100.0, round((load_1 / max(cpu_count, 1)) * 100, 1))

    try:
        proc = psutil.Process()
        proc_mem = proc.memory_info()
        proc_threads = proc.num_threads()
    except (SystemError, OSError, PermissionError):
        proc_mem = type("Mem", (), {"rss": 0})()
        proc_threads = 0

    physical = _safe_cpu_count_physical() or cpu_count
    cpu_model = (platform.processor() or "").strip() or platform.machine() or "Unknown"
    arch_summary = f"1 CPU, {physical} physical core, {cpu_count} logical core"

    swap_percent: float | None = None
    swap_used_human: str | None = None
    swap_total_human: str | None = None
    try:
        swap = psutil.swap_memory()
        swap_percent = round(float(swap.percent), 1)
        swap_used_human = _bytes_human(int(swap.used))
        swap_total_human = _bytes_human(int(swap.total))
    except (SystemError, OSError, PermissionError):
        pass

    platform_str = platform.platform()
    python_version = platform.python_version()
    host_uptime_seconds = 0.0
    try:
        host_uptime_seconds = max(0.0, time.time() - psutil.boot_time())
    except (SystemError, OSError, PermissionError):
        pass

    return {
        "collected_at": datetime.now(UTC),
        "hostname": socket.gethostname(),
        "platform": platform_str,
        "python_version": python_version,
        "system_label": _system_short_label(platform_str),
        "system_detail": _system_detail(platform_str, python_version),
        "host_uptime_seconds": round(host_uptime_seconds, 1),
        "host_uptime_label": _format_host_uptime(host_uptime_seconds),
        "cpu": {
            "percent": round(cpu_percent, 1),
            "count_logical": cpu_count,
            "count_physical": _safe_cpu_count_physical(),
            "model_name": cpu_model,
            "architecture_summary": arch_summary,
            "per_core_percent": per_core,
        },
        "memory": {
            "used_bytes": int(vm.used),
            "total_bytes": int(vm.total),
            "available_bytes": int(vm.available),
            "percent": round(float(vm.percent), 1),
            "used_human": _bytes_human(int(vm.used)),
            "total_human": _bytes_human(int(vm.total)),
            "available_human": _bytes_human(int(vm.available)),
            "swap_percent": swap_percent,
            "swap_used_human": swap_used_human,
            "swap_total_human": swap_total_human,
        },
        "disk": {
            "path": str(path),
            "used_bytes": int(disk.used),
            "total_bytes": int(disk.total),
            "free_bytes": int(disk.free),
            "percent": round(disk.used / disk.total * 100, 1) if disk.total else 0.0,
            "used_human": _bytes_human(int(disk.used)),
            "total_human": _bytes_human(int(disk.total)),
            "free_human": _bytes_human(int(disk.free)),
        },
        "load": {
            "load_1": round(load_1, 2),
            "load_5": round(load_5, 2),
            "load_15": round(load_15, 2),
            "percent": load_percent,
        },
        "process": {
            "rss_bytes": int(proc_mem.rss),
            "rss_human": _bytes_human(int(proc_mem.rss)),
            "threads": proc_threads,
        },
        "top_cpu_processes": _top_processes_by_cpu(),
        "top_memory_processes": _top_processes_by_memory(),
    }


def _top_processes_by_cpu(limit: int = 5) -> list[dict[str, Any]]:
    rows: list[tuple[float, dict[str, Any]]] = []
    for proc in psutil.process_iter(["pid", "name"]):
        try:
            pct = float(proc.cpu_percent(interval=0.0))
            name = proc.info.get("name") or "?"
            rows.append(
                (
                    pct,
                    {
                        "pid": int(proc.pid),
                        "name": name,
                        "cpu_percent": round(pct, 1),
                    },
                )
            )
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
        except (SystemError, OSError, PermissionError):
            continue
    rows.sort(key=lambda item: item[0], reverse=True)
    return [item[1] for item in rows[:limit]]


def _top_processes_by_memory(limit: int = 5) -> list[dict[str, Any]]:
    rows: list[tuple[int, dict[str, Any]]] = []
    for proc in psutil.process_iter(["pid", "name"]):
        try:
            mem = proc.memory_info()
            rss = int(mem.rss)
            pct = float(proc.memory_percent())
            name = proc.info.get("name") or "?"
            rows.append(
                (
                    rss,
                    {
                        "pid": int(proc.pid),
                        "name": name,
                        "memory_percent": round(pct, 1),
                        "rss_human": _bytes_human(rss),
                    },
                )
            )
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
        except (SystemError, OSError, PermissionError):
            continue
    rows.sort(key=lambda item: item[0], reverse=True)
    return [item[1] for item in rows[:limit]]
