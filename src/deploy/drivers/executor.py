"""Run platform-specific store driver scripts from ``libs/store_drivers/``."""

from __future__ import annotations

import os
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any

from core.paths import repo_root
from deploy.platform import detect_platform


def store_drivers_root() -> Path:
    return repo_root() / "libs" / "store_drivers"


def detect_executor_platform() -> str:
    """Platform key used to pick install/uninstall scripts."""
    plat = detect_platform()
    if plat.is_linux:
        if shutil.which("apt-get"):
            return "linux-debian"
        if shutil.which("dnf") or shutil.which("yum"):
            return "linux-rhel"
        return "linux"
    if plat.is_macos:
        return "darwin"
    if plat.is_windows:
        return "windows"
    return "unknown"


def native_driver_supported() -> bool:
    key = detect_executor_platform()
    return key in {"linux-debian", "linux-rhel", "linux", "darwin"}


def resolve_script(plugin_id: str, action: str) -> Path | None:
    """Resolve the best platform script with Linux fallbacks (Linux only)."""
    base = store_drivers_root() / plugin_id
    platform = detect_executor_platform()
    is_linux = platform.startswith("linux")
    candidates = [base / f"{action}-{platform}.sh"]
    if is_linux:
        # Allow Linux sub-platform fallbacks (rhel → generic linux)
        candidates += [
            base / f"{action}-linux-debian.sh",
            base / f"{action}-linux.sh",
        ]
    candidates.append(base / f"{action}.sh")
    for path in candidates:
        if path.is_file():
            return path
    return None


def run_driver_script(
    plugin_id: str,
    action: str,
    *,
    env: dict[str, str],
    timeout: int = 900,
    log_path: Path | None = None,
) -> dict[str, Any]:
    """Run a platform install/uninstall script.

    When *log_path* is given the subprocess stdout+stderr is written to that
    file line-by-line as the script runs, so the panel can tail it in real
    time before the script finishes.
    """
    script = resolve_script(plugin_id, action)
    if not script:
        platform = detect_executor_platform()
        return {
            "ok": False,
            "message": (
                f"No {action} script for {plugin_id} on {platform}. "
                "Use Docker install or connect an external instance."
            ),
        }

    merged = {**os.environ, **env}

    if log_path is not None:
        returncode, out = _run_privileged_streaming(
            ["bash", str(script)], env=merged, timeout=timeout, log_path=log_path
        )
    else:
        proc = _run_privileged(["bash", str(script)], env=merged, timeout=timeout)
        returncode = proc.returncode
        out = (proc.stdout or proc.stderr or "").strip()

    lines = [line for line in out.splitlines() if line.strip()]
    ok = returncode == 0
    return {
        "ok": ok,
        "message": lines[-1] if lines else (f"{action} {'ok' if ok else 'failed'}"),
        "log": out,
        "script": str(script),
        "returncode": returncode,
    }


def systemd_action(unit: str, action: str, *, timeout: int = 120) -> dict[str, Any]:
    if action not in {"start", "stop", "restart", "enable", "disable"}:
        return {"ok": False, "message": f"unknown systemd action: {action}"}
    if not shutil.which("systemctl"):
        return {"ok": False, "message": "systemctl not available on this host"}
    proc = _run_privileged(["systemctl", action, unit], timeout=timeout)
    ok = proc.returncode == 0
    detail = (proc.stdout or proc.stderr or "").strip()
    return {
        "ok": ok,
        "message": detail or f"{unit} {action} {'ok' if ok else 'failed'}",
    }


def service_active(unit: str) -> bool:
    if not unit or not shutil.which("systemctl"):
        return False
    proc = _run_privileged(
        ["systemctl", "is-active", unit],
        timeout=15,
    )
    return proc.returncode == 0 and (proc.stdout or "").strip() == "active"


def _run_privileged(
    argv: list[str],
    *,
    env: dict[str, str] | None = None,
    timeout: int,
) -> subprocess.CompletedProcess[str]:
    try:
        if os.geteuid() == 0:
            return subprocess.run(
                argv,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,
                env=env,
            )
    except AttributeError:
        pass

    sudo = shutil.which("sudo")
    if sudo:
        return subprocess.run(
            [sudo, *argv],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
            env=env,
        )

    return subprocess.run(
        argv,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
        env=env,
    )


def _privileged_argv(argv: list[str]) -> list[str]:
    """Prepend sudo when not root (same logic as _run_privileged)."""
    try:
        if os.geteuid() == 0:
            return argv
    except AttributeError:
        pass
    sudo = shutil.which("sudo")
    return [sudo, *argv] if sudo else argv


def _run_privileged_streaming(
    argv: list[str],
    *,
    env: dict[str, str],
    timeout: int,
    log_path: Path,
) -> tuple[int, str]:
    """Run *argv* streaming combined stdout+stderr to *log_path* line-by-line.

    Returns ``(returncode, full_output_string)`` so callers stay compatible
    with the non-streaming path.
    """
    log_path.parent.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    full_argv = _privileged_argv(argv)

    out_lines: list[str] = []
    returncode = 1
    with open(log_path, "w", encoding="utf-8", buffering=1) as lf:
        lf.write(f"[{ts}] Starting: {' '.join(full_argv)}\n")
        try:
            with subprocess.Popen(
                full_argv,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                env=env,
                bufsize=1,
            ) as proc:
                assert proc.stdout is not None  # noqa: S101
                for line in proc.stdout:
                    out_lines.append(line)
                    lf.write(line)
                proc.wait(timeout=timeout)
                returncode = proc.returncode
        except subprocess.TimeoutExpired:
            lf.write("\n[TIMEOUT] Script exceeded timeout limit.\n")
        except Exception as exc:
            lf.write(f"\n[ERROR] {exc}\n")
        finally:
            ts2 = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            lf.write(f"[{ts2}] Exit code: {returncode}\n")

    return returncode, "".join(out_lines).strip()
