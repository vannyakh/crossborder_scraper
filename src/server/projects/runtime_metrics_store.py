"""Project runtime metrics — host psutil samples scoped to flow services."""

from __future__ import annotations

import json
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from config import get_settings
from core.hardware import collect_hardware
from core.paths import data_dir

SERIES_COLORS = ["#3b82f6", "#22c55e", "#eab308", "#a855f7", "#06b6d4", "#f97316"]
MAX_SAMPLES = 48
MIN_SAMPLE_INTERVAL_SEC = 12
DISPLAY_SAMPLES = 24


def _metrics_dir() -> Path:
    return data_dir() / "projects" / "_runtime_metrics"


def _metrics_path(project_id: str) -> Path:
    safe = project_id.replace("/", "-").replace("..", "")
    return _metrics_dir() / f"{safe}.json"


def _now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _read_store(project_id: str) -> dict[str, Any]:
    path = _metrics_path(project_id)
    if not path.exists():
        return {"samples": [], "last_net_bytes": None, "last_sample_at": None}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"samples": [], "last_net_bytes": None, "last_sample_at": None}
    if not isinstance(raw, dict):
        return {"samples": [], "last_net_bytes": None, "last_sample_at": None}
    raw.setdefault("samples", [])
    return raw


def _write_store(project_id: str, store: dict[str, Any]) -> None:
    path = _metrics_path(project_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(store, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _service_nodes(project: dict[str, Any]) -> list[dict[str, Any]]:
    nodes = project.get("nodes") or []
    services: list[dict[str, Any]] = []
    for index, node in enumerate(nodes):
        role = node.get("role")
        if role in ("config", "note"):
            continue
        label = str(node.get("label") or node.get("id") or f"node-{index}")
        subtitle = node.get("subtitle")
        if subtitle:
            name = str(subtitle).split(":")[-1].strip() or label
        else:
            name = label
        status = node.get("status")
        weight = 1.0 if status != "offline" else 0.15
        services.append(
            {
                "id": str(node.get("id") or f"svc-{index}"),
                "name": name,
                "color": SERIES_COLORS[index % len(SERIES_COLORS)],
                "weight": weight,
                "status": status or "online",
            }
        )
    if not services:
        services.append(
            {
                "id": f"{project.get('id', 'project')}-gateway",
                "name": "gateway",
                "color": SERIES_COLORS[0],
                "weight": 1.0,
                "status": "online",
            }
        )
    return services[:6]


def _net_bytes_total() -> int:
    try:
        import psutil

        counters = psutil.net_io_counters()
        return int(counters.bytes_sent + counters.bytes_recv)
    except (ImportError, AttributeError, OSError):
        return 0


def _collect_host_snapshot(
    *, last_net_bytes: int | None, last_sample_at: float | None
) -> dict[str, Any]:
    settings = get_settings()
    try:
        hardware = collect_hardware(disk_path=settings.output_dir)
        cpu_cores = max(1, int(hardware["cpu"]["count_logical"]))
        cpu_vcpu = round(float(hardware["cpu"]["percent"]) / 100.0 / cpu_cores, 3)
        memory_mb = round(float(hardware["memory"]["used_bytes"]) / (1024 * 1024), 1)
        disk_gb = round(float(hardware["disk"]["used_bytes"]) / (1024**3), 3)
        cpu_percent = float(hardware["cpu"]["percent"])
        memory_percent = float(hardware["memory"]["percent"])
        disk_percent = float(hardware["disk"]["percent"])
    except (OSError, PermissionError, SystemError):
        cpu_cores = 1
        cpu_vcpu = 0.05
        memory_mb = 256.0
        disk_gb = 0.5
        cpu_percent = 5.0
        memory_percent = 12.0
        disk_percent = 20.0

    net_total = _net_bytes_total()
    network_mb = 0.0
    now = time.time()
    if last_net_bytes is not None and last_sample_at is not None and net_total >= last_net_bytes:
        elapsed_min = max((now - last_sample_at) / 60.0, 0.05)
        network_mb = round((net_total - last_net_bytes) / (1024 * 1024) / elapsed_min, 3)

    return {
        "cpu_vcpu": cpu_vcpu,
        "memory_mb": memory_mb,
        "network_mb": network_mb,
        "disk_gb": disk_gb,
        "cpu_percent": cpu_percent,
        "memory_percent": memory_percent,
        "disk_percent": disk_percent,
        "net_bytes": net_total,
        "collected_at": now,
    }


def _allocate_services(
    services: list[dict[str, Any]],
    host: dict[str, Any],
) -> list[dict[str, Any]]:
    total_weight = sum(float(s["weight"]) for s in services) or 1.0
    rows: list[dict[str, Any]] = []
    for svc in services:
        share = float(svc["weight"]) / total_weight
        rows.append(
            {
                "id": svc["id"],
                "name": svc["name"],
                "color": svc["color"],
                "cpu": round(host["cpu_vcpu"] * share, 3),
                "memory": round(host["memory_mb"] * share, 1),
                "network": round(host["network_mb"] * share, 3),
                "disk": round(host["disk_gb"] * share, 3),
            }
        )
    return rows


def record_project_runtime_sample(
    project: dict[str, Any], *, force: bool = False
) -> dict[str, Any] | None:
    """Append a host metrics sample scoped to project flow services."""
    project_id = str(project.get("id") or "")
    if not project_id:
        return None

    store = _read_store(project_id)
    last_at = store.get("last_sample_at")
    now = time.time()
    if (
        not force
        and isinstance(last_at, int | float)
        and now - float(last_at) < MIN_SAMPLE_INTERVAL_SEC
    ):
        return None

    host = _collect_host_snapshot(
        last_net_bytes=store.get("last_net_bytes"),
        last_sample_at=float(last_at) if isinstance(last_at, int | float) else None,
    )
    services = _allocate_services(_service_nodes(project), host)
    sample = {
        "at": _now_iso(),
        "host": {
            "cpu_percent": host["cpu_percent"],
            "memory_percent": host["memory_percent"],
            "disk_percent": host["disk_percent"],
        },
        "services": services,
    }
    samples = store.get("samples") or []
    samples.append(sample)
    store["samples"] = samples[-MAX_SAMPLES:]
    store["last_net_bytes"] = host["net_bytes"]
    store["last_sample_at"] = now
    _write_store(project_id, store)
    return sample


def delete_project_runtime_metrics(project_id: str) -> bool:
    path = _metrics_path(project_id)
    if not path.exists():
        return False
    path.unlink()
    return True


def _format_label(iso_at: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_at.replace("Z", "+00:00"))
        return dt.astimezone().strftime("%H:%M")
    except ValueError:
        return "—"


def _build_series(
    samples: list[dict[str, Any]],
    services: list[dict[str, Any]],
    metric: str,
) -> list[dict[str, Any]]:
    series: list[dict[str, Any]] = []
    for svc in services:
        values: list[float] = []
        for sample in samples:
            row = next((s for s in sample.get("services") or [] if s.get("id") == svc["id"]), None)
            values.append(float(row.get(metric) or 0) if row else 0.0)
        series.append(
            {
                "id": svc["id"],
                "name": svc["name"],
                "color": svc["color"],
                "values": values,
            }
        )
    return series


def build_project_runtime_payload(project: dict[str, Any]) -> dict[str, Any]:
    """Collect a fresh sample (if due) and return chart + state payload."""
    from server.projects.runtime_log_store import list_project_runtime_logs

    project_id = str(project.get("id") or "")
    record_project_runtime_sample(project)

    store = _read_store(project_id)
    samples = store.get("samples") or []
    display = samples[-DISPLAY_SAMPLES:]
    services = _service_nodes(project)
    labels = [_format_label(str(s.get("at") or "")) for s in display]
    latest = display[-1] if display else None
    host = latest.get("host") if latest else {}

    log_items, _ = list_project_runtime_logs(project_id, limit=6, offset=0)
    recent_logs = [
        {
            "id": str(row.get("id") or ""),
            "level": str(row.get("level") or "info"),
            "message": str(row.get("message") or ""),
            "node_label": row.get("node_label"),
            "created_at": str(row.get("created_at") or ""),
        }
        for row in log_items
    ]

    return {
        "project_id": project_id,
        "live": True,
        "simulated": True,
        "state": {
            "services_online": int(project.get("services_online") or 0),
            "services_total": int(project.get("services_total") or 0),
            "nodes": len(project.get("nodes") or []),
            "flow_revision": int(project.get("flow_revision") or 0),
            "host_cpu_percent": float(host.get("cpu_percent") or 0),
            "host_memory_percent": float(host.get("memory_percent") or 0),
            "host_disk_percent": float(host.get("disk_percent") or 0),
            "collected_at": str(latest.get("at") or _now_iso()) if latest else _now_iso(),
        },
        "metrics": {
            "labels": labels,
            "cpu": _build_series(display, services, "cpu"),
            "memory": _build_series(display, services, "memory"),
            "network": _build_series(display, services, "network"),
            "disk": _build_series(display, services, "disk"),
        },
        "recent_logs": recent_logs,
    }
