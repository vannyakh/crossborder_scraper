"""Linux VPS paths under /www/wwwroot."""

from __future__ import annotations

import os
import pwd
import subprocess
from pathlib import Path

DEFAULT_WWWROOT = Path("/www/wwwroot")
DEFAULT_SITE_NAME = "crossborder_scraper"
SERVICE_USER = "crossborder"


def default_vps_install_dir(site_name: str | None = None) -> Path:
    name = (site_name or os.environ.get("CROSSBORDER_SITE_NAME") or DEFAULT_SITE_NAME).strip()
    return DEFAULT_WWWROOT / name


def should_use_wwwroot_layout() -> bool:
    if os.environ.get("CROSSBORDER_VPS", "").lower() in ("1", "true", "yes"):
        return True
    if os.environ.get("CROSSBORDER_WWWROOT", "").lower() in ("1", "true", "yes"):
        return True
    # Legacy alias (undocumented): CROSSBORDER_AAPANEL
    if os.environ.get("CROSSBORDER_AAPANEL", "").lower() in ("1", "true", "yes"):
        return True
    if Path("/www/wwwroot").is_dir() and os.name == "posix":
        try:
            import platform

            if platform.system() == "Linux":
                return True
        except Exception:
            pass
    return False


def resolve_install_dir(explicit: str | Path | None = None) -> Path:
    if explicit:
        return Path(explicit).expanduser().resolve()
    env = os.environ.get("CROSSBORDER_INSTALL_DIR", "").strip()
    if env:
        return Path(env).expanduser().resolve()
    if should_use_wwwroot_layout():
        return default_vps_install_dir()
    return Path.home() / "crossborder-scraper"


def _user_exists(name: str) -> bool:
    try:
        pwd.getpwnam(name)
        return True
    except KeyError:
        return False


def prepare_wwwroot_site(
    install_dir: Path,
    *,
    service_user: str = SERVICE_USER,
    run_as_root: bool | None = None,
) -> tuple[list[str], list[str]]:
    """
    Create /www/wwwroot/<site>, optional dedicated user, ownership.

    Returns (steps_done, warnings).
    """
    steps: list[str] = []
    warnings: list[str] = []

    if os.name != "posix":
        return steps, warnings

    try:
        import platform

        if platform.system() != "Linux":
            return steps, warnings
    except Exception:
        return steps, warnings

    is_root = run_as_root if run_as_root is not None else (os.geteuid() == 0)
    install_dir.mkdir(parents=True, exist_ok=True)
    steps.append(f"wwwroot:{install_dir}")

    owner_user = os.environ.get("SUDO_USER") or os.environ.get("USER") or ""

    if is_root and not _user_exists(service_user):
        try:
            subprocess.run(
                [
                    "useradd",
                    "-r",
                    "-m",
                    "-d",
                    str(install_dir),
                    "-s",
                    "/bin/bash",
                    service_user,
                ],
                check=True,
                capture_output=True,
            )
            steps.append(f"user:{service_user}")
            owner_user = service_user
        except subprocess.CalledProcessError as exc:
            warnings.append(f"Could not create user {service_user}: {exc}")

    if is_root and owner_user:
        try:

            subprocess.run(
                ["chown", "-R", f"{owner_user}:{owner_user}", str(install_dir)],
                check=True,
            )
            steps.append(f"chown:{owner_user}")
        except (subprocess.CalledProcessError, OSError) as exc:
            warnings.append(f"chown failed: {exc}")

    (install_dir / "config").mkdir(parents=True, exist_ok=True)
    steps.append("wwwroot_dirs")

    return steps, warnings


def init_runtime_tree() -> list[str]:
    """Create ``var/`` runtime layout under the app root (call after clone on VPS)."""
    import os

    os.environ.setdefault("CROSSBORDER_VAR_LAYOUT", "1")
    from core.paths import ensure_runtime_layout

    return ensure_runtime_layout()
