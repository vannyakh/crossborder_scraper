"""Docker host service — engine status, install, containers, Hub search."""

from __future__ import annotations

import json
import os
import platform
import shutil
import socket
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import yaml

from core.paths import docker_config_path, runtime_layout_dirs
from deploy.docker_install import docker_binary_present, run_install, run_service_action
from deploy.platform import detect_platform
from server.app_store import docker as store_docker

_DEFAULT_CONFIG: dict[str, Any] = {
    "registry_mirrors": [],
    "compose_path": "",
    "install_dir": "",
    "log_max_size": "100m",
    "log_max_file": 3,
    "ipv6": False,
    "iptables": True,
    "live_restore": False,
}

_HUB_FEATURED = [
    {"name": "redis", "image": "redis:7-alpine", "description": "In-memory cache and message broker"},
    {"name": "postgres", "image": "postgres:16-alpine", "description": "Relational database"},
    {"name": "mysql", "image": "mysql:8", "description": "MySQL database server"},
    {"name": "mongo", "image": "mongo:7", "description": "Document database"},
    {"name": "nginx", "image": "nginx:alpine", "description": "Web server and reverse proxy"},
    {"name": "rabbitmq", "image": "rabbitmq:3-management-alpine", "description": "Message queue with management UI"},
    {"name": "memcached", "image": "memcached:1.6-alpine", "description": "Distributed memory cache"},
    {"name": "minio", "image": "minio/minio:latest", "description": "S3-compatible object storage"},
]


def _run_docker(args: list[str], *, timeout: int = 30) -> tuple[int, str, str]:
    if not shutil.which("docker"):
        return 127, "", "docker not found"
    proc = subprocess.run(
        ["docker", *args],
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    return proc.returncode, proc.stdout or "", proc.stderr or ""


def _load_panel_config() -> dict[str, Any]:
    path = docker_config_path()
    if not path.is_file():
        cfg = dict(_DEFAULT_CONFIG)
        dirs = runtime_layout_dirs()
        default_install = str(dirs["data"].parent / "containers")
        cfg["install_dir"] = default_install
        cfg["compose_path"] = default_install
        return cfg
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    merged = {**_DEFAULT_CONFIG, **raw} if isinstance(raw, dict) else dict(_DEFAULT_CONFIG)
    return merged


def _save_panel_config(data: dict[str, Any]) -> dict[str, Any]:
    path = docker_config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    return data


def _systemd_docker_active() -> str | None:
    if not shutil.which("systemctl"):
        return None
    try:
        proc = subprocess.run(
            ["systemctl", "is-active", "docker"],
            capture_output=True,
            text=True,
            timeout=8,
            check=False,
        )
        return proc.stdout.strip() or "unknown"
    except (OSError, subprocess.TimeoutExpired):
        return None


def _memory_gb() -> float | None:
    try:
        if platform.system().lower() == "linux":
            meminfo = Path("/proc/meminfo").read_text(encoding="utf-8")
            for line in meminfo.splitlines():
                if line.startswith("MemTotal:"):
                    kb = int(line.split()[1])
                    return round(kb / 1024 / 1024, 2)
    except (OSError, ValueError):
        pass
    return None


def _cpu_cores() -> int | None:
    try:
        return len(os.sched_getaffinity(0))  # type: ignore[attr-defined]
    except AttributeError:
        return os.cpu_count()


def _docker_versions() -> dict[str, str]:
    versions: dict[str, str] = {}
    code, out, _ = _run_docker(["version", "--format", "{{json .}}"], timeout=15)
    if code == 0 and out.strip():
        try:
            payload = json.loads(out)
            client = payload.get("Client") or {}
            server = payload.get("Server") or {}
            versions["docker_client"] = str(client.get("Version") or "")
            versions["docker_server"] = str(server.get("Version") or "")
            compose = client.get("ComposeVersion") or server.get("ComposeVersion")
            if compose:
                versions["compose"] = str(compose)
        except json.JSONDecodeError:
            pass
    if "compose" not in versions and store_docker.compose_cli_available():
        code, out, _ = _run_docker(["compose", "version", "--short"], timeout=10)
        if code == 0:
            versions["compose"] = out.strip()
    return versions


class DockerHostService:
    def get_status(self) -> dict[str, Any]:
        plat = detect_platform()
        env = store_docker.environment_info()
        cfg = _load_panel_config()
        systemd = _systemd_docker_active()
        daemon_running = bool(env.get("docker_available"))

        if not docker_binary_present():
            service_status = "not_installed"
        elif daemon_running:
            service_status = "running"
        elif systemd in ("active", "activating"):
            service_status = "running"
        elif systemd == "inactive":
            service_status = "stopped"
        else:
            service_status = "stopped"

        versions = _docker_versions() if docker_binary_present() else {}

        return {
            "installed": docker_binary_present(),
            "daemon_running": daemon_running,
            "service_status": service_status,
            "docker_available": env.get("docker_available", False),
            "compose_available": env.get("compose_available", False),
            "hostname": socket.gethostname(),
            "system": plat.system,
            "architecture": plat.machine,
            "kernel": platform.release(),
            "cpu_cores": _cpu_cores(),
            "memory_gb": _memory_gb(),
            "docker_version": versions.get("docker_server") or versions.get("docker_client") or "",
            "compose_version": versions.get("compose") or "",
            "unix_socket": "unix:///var/run/docker.sock",
            "config_path": str(docker_config_path()),
            "install_dir": cfg.get("install_dir") or "",
            "needs_install": not docker_binary_present(),
            "can_install": plat.is_linux and not docker_binary_present(),
        }

    def get_config(self) -> dict[str, Any]:
        cfg = _load_panel_config()
        mirrors = cfg.get("registry_mirrors") or []
        mirror_display = ", ".join(mirrors) if mirrors else ""
        return {
            **cfg,
            "registry_mirror_display": mirror_display or "Acceleration URL not set",
        }

    def update_config(self, patch: dict[str, Any]) -> dict[str, Any]:
        cfg = _load_panel_config()
        for key in (
            "registry_mirrors",
            "compose_path",
            "install_dir",
            "log_max_size",
            "log_max_file",
            "ipv6",
            "iptables",
            "live_restore",
        ):
            if key in patch and patch[key] is not None:
                cfg[key] = patch[key]
        if "registry_mirror" in patch and patch["registry_mirror"] is not None:
            raw = str(patch["registry_mirror"]).strip()
            cfg["registry_mirrors"] = [raw] if raw else []
        _save_panel_config(cfg)
        return self.get_config()

    async def install(self, *, username: str = "panel") -> dict[str, Any]:
        result = run_install(username=username)
        result["status"] = self.get_status()
        return result

    def service_control(self, action: str) -> dict[str, Any]:
        result = run_service_action(action)
        result["status"] = self.get_status()
        return result

    def list_containers(self) -> dict[str, Any]:
        if not store_docker.docker_cli_available():
            return {"items": [], "total": 0, "error": "Docker daemon not available"}

        code, out, err = _run_docker(
            ["ps", "-a", "--format", "{{json .}}"],
            timeout=30,
        )
        if code != 0:
            return {"items": [], "total": 0, "error": (err or out or f"exit {code}").strip()}

        items: list[dict[str, Any]] = []
        for line in out.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            items.append(
                {
                    "id": row.get("ID", ""),
                    "name": row.get("Names", ""),
                    "image": row.get("Image", ""),
                    "status": row.get("Status", ""),
                    "ports": row.get("Ports", ""),
                    "running": str(row.get("State", "")).lower() == "running",
                    "created": row.get("CreatedAt", ""),
                }
            )

        return {"items": items, "total": len(items)}

    def hub_featured(self) -> dict[str, Any]:
        return {"items": list(_HUB_FEATURED), "total": len(_HUB_FEATURED)}

    async def hub_search(self, *, query: str, limit: int = 24) -> dict[str, Any]:
        q = query.strip()
        if not q:
            return self.hub_featured()

        url = "https://hub.docker.com/v2/search/repositories/"
        params = {"query": q, "page_size": min(limit, 50)}
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError as exc:
            return {"items": [], "total": 0, "error": str(exc), "query": q}

        items = []
        for row in data.get("results") or []:
            name = str(row.get("repo_name") or "")
            if not name:
                continue
            items.append(
                {
                    "name": name,
                    "image": name if ":" in name else f"{name}:latest",
                    "description": str(row.get("short_description") or row.get("description") or ""),
                    "stars": int(row.get("star_count") or 0),
                    "pulls": int(row.get("pull_count") or 0),
                    "official": bool(row.get("is_official")),
                }
            )
        return {"items": items, "total": len(items), "query": q}

    async def pull_image(self, image: str) -> dict[str, Any]:
        if not store_docker.docker_cli_available():
            return {"ok": False, "message": "Docker daemon not available"}
        img = image.strip()
        if not img:
            return {"ok": False, "message": "image required"}
        code, out, err = _run_docker(["pull", img], timeout=600)
        ok = code == 0
        return {
            "ok": ok,
            "image": img,
            "message": (out or err or ("pulled" if ok else f"exit {code}")).strip()[-2000:],
        }

    async def run_container(
        self,
        *,
        image: str,
        name: str | None = None,
        port: int | None = None,
        host_port: int | None = None,
    ) -> dict[str, Any]:
        if not store_docker.docker_cli_available():
            return {"ok": False, "message": "Docker daemon not available"}

        img = image.strip()
        if not img:
            return {"ok": False, "message": "image required"}

        pull = await self.pull_image(img)
        if not pull.get("ok"):
            return pull

        args = ["run", "-d", "--restart", "unless-stopped"]
        container_name = (name or "").strip()
        if not container_name:
            slug = img.split("/")[-1].split(":")[0].replace(".", "-")[:32]
            container_name = f"cb-{slug}-{datetime.now(UTC).strftime('%H%M%S')}"
        args.extend(["--name", container_name])

        if port and host_port:
            args.extend(["-p", f"{host_port}:{port}"])
        elif host_port:
            args.extend(["-p", f"{host_port}:{host_port}"])

        args.append(img)

        code, out, err = _run_docker(args, timeout=120)
        ok = code == 0
        return {
            "ok": ok,
            "container_id": out.strip()[:64] if ok else "",
            "container_name": container_name,
            "image": img,
            "message": (err or out or ("started" if ok else f"exit {code}")).strip()[-2000:],
        }

    def container_action(self, container_id: str, action: str) -> dict[str, Any]:
        if action not in ("start", "stop", "restart", "remove"):
            return {"ok": False, "message": f"unknown action: {action}"}
        if not store_docker.docker_cli_available():
            return {"ok": False, "message": "Docker daemon not available"}
        cid = container_id.strip()
        if not cid:
            return {"ok": False, "message": "container id required"}

        args = [action, cid] if action != "remove" else ["rm", "-f", cid]
        code, out, err = _run_docker(args, timeout=60)
        ok = code == 0
        return {
            "ok": ok,
            "action": action,
            "container_id": cid,
            "message": (out or err or action).strip()[-1000:],
        }


_service: DockerHostService | None = None


def get_docker_host_service() -> DockerHostService:
    global _service
    if _service is None:
        _service = DockerHostService()
    return _service
