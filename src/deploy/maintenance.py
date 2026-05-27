"""Self-host maintenance — sync/update, restart, reset for the panel."""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass, field
from enum import StrEnum

from core.paths import (
    config_dir,
    data_dir,
    repo_root,
)
from deploy.docker_compose import compose_restart, compose_status_running, docker_ready, run_compose
from deploy.platform import detect_platform, python_executable

SYSTEMD_UNIT = "crossborder-scraper"


class RuntimeKind(StrEnum):
    DOCKER = "docker"
    SYSTEMD = "systemd"
    PROCESS = "process"
    NONE = "none"


@dataclass
class MaintenanceResult:
    steps: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    runtime: RuntimeKind = RuntimeKind.NONE
    access: object | None = None

    def ok(self, msg: str) -> None:
        self.steps.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)


def detect_runtime() -> RuntimeKind:
    if docker_ready() and compose_status_running():
        return RuntimeKind.DOCKER
    plat = detect_platform()
    if plat.has_systemd and _systemd_active(SYSTEMD_UNIT):
        return RuntimeKind.SYSTEMD
    if _process_on_panel_port():
        return RuntimeKind.PROCESS
    return RuntimeKind.NONE


def _systemd_active(unit: str) -> bool:
    try:
        proc = subprocess.run(
            ["systemctl", "is-active", "--quiet", unit],
            capture_output=True,
            check=False,
        )
        return proc.returncode == 0
    except OSError:
        return False


def _process_on_panel_port() -> bool:
    try:
        import psutil
    except ImportError:
        return False
    from config import get_settings

    port = get_settings().panel_port
    try:
        # On macOS, psutil may raise AccessDenied for some processes.
        # Treat that as "can't determine", rather than crashing update/apply.
        conns = psutil.net_connections(kind="inet")
    except Exception:
        return False

    for conn in conns:
        if conn.laddr and conn.laddr.port == port and conn.status == "LISTEN":
            return True
    return False


def git_pull(*, branch: str | None = None) -> tuple[bool, str]:
    root = repo_root()
    if not (root / ".git").is_dir():
        return False, "not a git repository — skip pull or set CROSSBORDER_REPO clone path"
    args = ["git", "-C", str(root), "pull", "--ff-only"]
    if branch:
        args = ["git", "-C", str(root), "fetch", "origin", branch]
        fetch = subprocess.run(args, capture_output=True, text=True, check=False)
        if fetch.returncode != 0:
            return False, fetch.stderr or fetch.stdout or "git fetch failed"
        checkout = subprocess.run(
            ["git", "-C", str(root), "checkout", branch],
            capture_output=True,
            text=True,
            check=False,
        )
        if checkout.returncode != 0:
            return False, checkout.stderr or "git checkout failed"
        args = ["git", "-C", str(root), "pull", "--ff-only", "origin", branch]
    proc = subprocess.run(args, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        return False, proc.stderr or proc.stdout or "git pull failed"
    return True, (proc.stdout or "up to date").strip()


def sync_dependencies(*, dev: bool = False) -> tuple[bool, str]:
    root = repo_root()
    plat = detect_platform()
    if plat.has_uv and (root / "pyproject.toml").is_file():
        proc = subprocess.run(["uv", "sync"], cwd=root, capture_output=True, text=True, check=False)
    else:
        proc = subprocess.run(
            [python_executable(), "-m", "pip", "install", "-e", str(root)],
            capture_output=True,
            text=True,
            check=False,
        )
    if proc.returncode != 0:
        return False, proc.stderr or proc.stdout or "dependency sync failed"
    return True, "dependencies synced"


def sync_playwright(*, with_deps: bool = False) -> tuple[bool, str]:
    args = [python_executable(), "-m", "playwright", "install", "chromium"]
    plat = detect_platform()
    if with_deps and plat.is_linux:
        deps = subprocess.run(
            [python_executable(), "-m", "playwright", "install-deps", "chromium"],
            capture_output=True,
            text=True,
            check=False,
        )
        if deps.returncode != 0:
            return False, deps.stderr or "playwright install-deps failed"
    proc = subprocess.run(args, cwd=repo_root(), capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        return False, proc.stderr or "playwright install failed"
    return True, "playwright chromium updated"


def run_sync(
    *,
    pull: bool = True,
    branch: str | None = None,
    deps: bool = True,
    browser: bool = False,
    browser_deps: bool = False,
    docker_rebuild: bool = False,
) -> MaintenanceResult:
    """Pull latest code and refresh dependencies."""
    result = MaintenanceResult()
    result.runtime = detect_runtime()

    if pull:
        ok, msg = git_pull(branch=branch)
        if ok:
            result.ok(f"git: {msg}")
        else:
            result.warn(f"git: {msg}")

    if deps:
        ok, msg = sync_dependencies()
        if ok:
            result.ok(msg)
        else:
            result.warn(msg)

    if browser:
        ok, msg = sync_playwright(with_deps=browser_deps)
        if ok:
            result.ok(msg)
        else:
            result.warn(msg)

    if docker_rebuild and result.runtime == RuntimeKind.DOCKER:
        code = run_compose("up", "-d", "--build")
        if code == 0:
            result.ok("docker: rebuilt and restarted stack")
        else:
            result.warn(f"docker rebuild exited {code}")

    elif result.runtime == RuntimeKind.DOCKER and deps:
        result.warn(
            "docker stack running — run: scraper tools restart "
            "(or tools sync --docker-rebuild)"
        )

    return result


def run_update(
    *,
    pull: bool = True,
    branch: str | None = None,
    browser: bool = True,
    restart_after: bool = True,
    runtime: RuntimeKind | None = None,
) -> MaintenanceResult:
    """Sync then restart panel (full software update)."""
    result = run_sync(pull=pull, branch=branch, deps=True, browser=browser, browser_deps=False)
    if restart_after:
        rt = runtime or result.runtime
        if rt == RuntimeKind.NONE:
            rt = detect_runtime()
        restart_result = run_restart(runtime=rt)
        result.steps.extend(restart_result.steps)
        result.warnings.extend(restart_result.warnings)
        result.runtime = restart_result.runtime
    return result


def run_restart(*, runtime: RuntimeKind | None = None) -> MaintenanceResult:
    """Restart panel service (Docker, systemd, or process on panel port)."""
    result = MaintenanceResult()
    rt = runtime or detect_runtime()
    result.runtime = rt

    if rt == RuntimeKind.DOCKER:
        code = compose_restart()
        if code == 0:
            result.ok("docker: stack restarted")
        else:
            result.warn(f"docker restart exited {code}")
        return result

    if rt == RuntimeKind.SYSTEMD:
        proc = subprocess.run(
            ["systemctl", "restart", SYSTEMD_UNIT],
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode == 0:
            result.ok(f"systemd: {SYSTEMD_UNIT} restarted")
        else:
            result.warn(proc.stderr or f"systemctl restart {SYSTEMD_UNIT} failed")
        return result

    if rt == RuntimeKind.PROCESS:
        killed = _stop_panel_process()
        if killed:
            result.ok("stopped panel process (port listener)")
            result.warn("start again: uv run scraper serve --no-reload")
        else:
            result.warn("could not stop panel process — stop manually and run scraper serve")
        return result

    result.warn("no running panel detected (docker / systemd / process)")
    result.warn("start: uv run scraper serve --no-reload  OR  scraper deploy up")
    return result


def _stop_panel_process() -> bool:
    try:
        import psutil
    except ImportError:
        return False
    from config import get_settings

    port = get_settings().panel_port
    stopped = False
    for proc in psutil.process_iter(["pid", "name"]):
        try:
            for conn in proc.net_connections(kind="inet"):
                if conn.laddr and conn.laddr.port == port and conn.status == "LISTEN":
                    proc.terminate()
                    proc.wait(timeout=15)
                    stopped = True
        except (psutil.Error, OSError):
            continue
    return stopped


class ResetScope(StrEnum):
    CREDENTIALS = "credentials"
    CONFIG = "config"
    DATA = "data"
    CACHE = "cache"
    ALL = "all"


def run_reset(
    scope: ResetScope,
    *,
    yes: bool = False,
    regenerate: bool = True,
) -> MaintenanceResult:
    """
    Reset panel state.

    - credentials: new PANEL_USERNAME/PASSWORD
    - config: re-copy example configs (backs up existing to *.bak)
    - data: remove data/output, cookies, products.db
    - cache: __pycache__ under repo
    - all: credentials + config + data (requires --yes)
    """
    result = MaintenanceResult()
    scopes = _resolve_reset_scopes(scope)

    if ResetScope.DATA in scopes or ResetScope.CONFIG in scopes:
        if not yes:
            result.warn("destructive reset requires --yes")
            return result

    if ResetScope.CREDENTIALS in scopes and regenerate:
        from deploy.bootstrap import bootstrap_server

        _boot, access = bootstrap_server(
            server=False,
            install_deps=False,
            install_browser=False,
            regenerate_credentials=True,
        )
        result.access = access
        result.ok("credentials: regenerated panel login")
        result.steps.append(f"username={access.username}")

    if ResetScope.CONFIG in scopes:
        n = _reset_config_from_examples()
        result.ok(f"config: reset {n} file(s) from examples (backups *.bak)")

    if ResetScope.DATA in scopes:
        n = _clear_data_dir()
        result.ok(f"data: cleared {n} path(s)")

    if ResetScope.CACHE in scopes:
        n = _clear_pycache()
        result.ok(f"cache: removed {n} __pycache__ dir(s)")

    return result


def _resolve_reset_scopes(scope: ResetScope) -> set[ResetScope]:
    if scope == ResetScope.ALL:
        return {ResetScope.CREDENTIALS, ResetScope.CONFIG, ResetScope.DATA, ResetScope.CACHE}
    return {scope}


def _reset_config_from_examples() -> int:
    from deploy.bootstrap import ServerBootstrap

    boot = ServerBootstrap(root=repo_root(), platform=detect_platform())
    cfg = config_dir()
    count = 0
    seeds: list[tuple[str, str]] = [
        ("ui_config.example.json", "ui_config.json"),
        ("agent_schedules.example.json", "agent_schedules.json"),
        ("agent_skills.example.yaml", "agent_skills.yaml"),
    ]
    for src_name, dest_name in seeds:
        src = cfg / src_name
        dest = cfg / dest_name
        if not src.is_file():
            continue
        if dest.is_file():
            bak = dest.with_suffix(dest.suffix + ".bak")
            shutil.copy2(dest, bak)
        shutil.copy2(src, dest)
        count += 1
    boot.seed_config_files()
    return count


def _clear_data_dir() -> int:
    root = data_dir()
    removed = 0
    targets = [
        root / "output",
        root / "cookies",
        root / "products.db",
        root / "products.db-wal",
        root / "products.db-shm",
    ]
    for path in targets:
        if path.is_dir():
            shutil.rmtree(path, ignore_errors=True)
            path.mkdir(parents=True, exist_ok=True)
            removed += 1
        elif path.is_file():
            path.unlink(missing_ok=True)
            removed += 1
    return removed


def _clear_pycache() -> int:
    count = 0
    for path in repo_root().rglob("__pycache__"):
        if path.is_dir():
            shutil.rmtree(path, ignore_errors=True)
            count += 1
    return count
