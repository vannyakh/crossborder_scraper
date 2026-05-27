"""Repository path helpers — app root vs mutable runtime directories."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

_LAYOUT_MARKER = ".crossborder_layout"


@lru_cache(maxsize=1)
def repo_root() -> Path:
    """Application root (``src/``, ``config/``, ``apps/``, ``.venv``)."""
    return Path(__file__).resolve().parents[2]


def src_dir() -> Path:
    return repo_root() / "src"


def apps_web_dir() -> Path:
    return repo_root() / "apps" / "web"


def ui_dist_dir() -> Path:
    return apps_web_dir() / "dist"


def ui_is_built() -> bool:
    dist = ui_dist_dir()
    return dist.is_dir() and (dist / "index.html").is_file()


def config_dir() -> Path:
    """Panel YAML/JSON templates (``plugins.yaml``, ``ui_config.json``)."""
    return repo_root() / "config"


def env_file_path() -> Path:
    return repo_root() / ".env"


def should_use_wwwroot_install() -> bool:
    """True when install targets a typical Linux web root (e.g. /www/wwwroot/...)."""
    if os.environ.get("CROSSBORDER_VPS", "").lower() in ("1", "true", "yes"):
        return True
    if os.environ.get("CROSSBORDER_WWWROOT", "").lower() in ("1", "true", "yes"):
        return True
    if os.environ.get("CROSSBORDER_AAPANEL", "").lower() in ("1", "true", "yes"):
        return True
    root = str(repo_root())
    return "/www/wwwroot/" in root or root.startswith("/www/wwwroot")


def prefer_var_layout() -> bool:
    """
    Mutable files live under ``var/`` (plugins, skills, data, uploads, logs).

    Legacy dev clones keep ``data/`` and ``installed_plugins/`` at repo root.
    """
    explicit = os.environ.get("CROSSBORDER_VAR_LAYOUT", "").strip().lower()
    if explicit in ("0", "false", "no"):
        return False
    if explicit in ("1", "true", "yes"):
        return True
    if os.environ.get("CROSSBORDER_VAR_DIR", "").strip():
        return True
    marker = repo_root() / "var" / _LAYOUT_MARKER
    if marker.is_file():
        return True
    root = repo_root()
    if (root / "var").is_dir() and should_use_wwwroot_install():
        return True
    if should_use_wwwroot_install() and not (root / "data").is_dir():
        return True
    if (root / "var").is_dir() and not (root / "data").is_dir():
        return True
    return False


def var_root() -> Path:
    """Parent directory for all runtime/mutable state."""
    override = os.environ.get("CROSSBORDER_VAR_DIR", "").strip()
    if override:
        return Path(override).expanduser().resolve()
    if prefer_var_layout():
        return repo_root() / "var"
    return repo_root()


def data_dir() -> Path:
    if prefer_var_layout():
        return var_root() / "data"
    return repo_root() / "data"


def uploads_dir() -> Path:
    if prefer_var_layout():
        return var_root() / "uploads"
    return data_dir() / "uploads"


def installed_plugins_dir() -> Path:
    if prefer_var_layout():
        return var_root() / "plugins"
    return repo_root() / "installed_plugins"


def installed_skills_dir() -> Path:
    if prefer_var_layout():
        return var_root() / "skills"
    return repo_root() / "installed_skills"


def logs_dir() -> Path:
    if prefer_var_layout():
        return var_root() / "logs"
    return data_dir()


def store_metadata_dir() -> Path:
    """Docker App Store install metadata (under runtime data)."""
    return data_dir() / "store"


def prompts_dir() -> Path:
    return repo_root() / "libs" / "prompts"


def builtin_skills_dir() -> Path:
    return repo_root() / "skills"


def builtin_plugins_dir() -> Path:
    return src_dir() / "plugins"


def plugins_config_path() -> Path:
    return config_dir() / "plugins.yaml"


def agent_skills_config_path() -> Path:
    return config_dir() / "agent_skills.yaml"


def agent_rules_config_path() -> Path:
    return config_dir() / "agent_rules.yaml"


def builtin_agent_rules_dir() -> Path:
    return repo_root() / "libs" / "agent_rules"


def custom_agent_rules_dir() -> Path:
    return data_dir() / "agent_rules"


def runtime_layout_dirs() -> dict[str, Path]:
    """Named runtime directories for panel, installers, and docs."""
    return {
        "var": var_root(),
        "data": data_dir(),
        "uploads": uploads_dir(),
        "plugins": installed_plugins_dir(),
        "skills": installed_skills_dir(),
        "logs": logs_dir(),
        "store": store_metadata_dir(),
    }


def ensure_runtime_layout() -> list[str]:
    """
    Create runtime folders and layout marker. Returns created path labels.

    Call after install / ``crossborder setup --server`` on VPS.
    """
    created: list[str] = []
    if prefer_var_layout():
        (repo_root() / "var").mkdir(parents=True, exist_ok=True)
        marker = repo_root() / "var" / _LAYOUT_MARKER
        if not marker.exists():
            marker.write_text(
                "# Crossborder runtime layout — mutable data; keep while panel runs.\n",
                encoding="utf-8",
            )
        created.append("var/")
    for name, path in runtime_layout_dirs().items():
        if name == "var":
            continue
        path.mkdir(parents=True, exist_ok=True)
        if prefer_var_layout():
            gitkeep = path / ".gitkeep"
            if not any(path.iterdir()):
                gitkeep.touch(exist_ok=True)
        created.append(str(path.relative_to(repo_root())))
    return created


def docker_config_path() -> Path:
    return config_dir() / "docker.yaml"


def firewall_config_path() -> Path:
    return config_dir() / "firewall_rules.yaml"


def layout_summary() -> dict[str, str]:
    """Human-readable paths for install card / API."""
    root = repo_root()
    dirs = runtime_layout_dirs()
    return {
        "app_root": str(root),
        "layout": "var" if prefer_var_layout() else "legacy",
        "data": str(dirs["data"]),
        "uploads": str(dirs["uploads"]),
        "plugins": str(dirs["plugins"]),
        "skills": str(dirs["skills"]),
        "logs": str(dirs["logs"]),
        "config": str(config_dir()),
    }


def resolve_settings_paths(settings: Any) -> Any:
    """Anchor relative Settings paths to canonical runtime directories."""
    d = data_dir()
    settings.data_dir = d
    settings.cookies_dir = d / "cookies"
    settings.output_dir = d / "output"
    settings.db_path = d / "products.db"
    proxy = settings.proxy_list_path
    if proxy and not Path(proxy).is_absolute():
        candidate = config_dir() / "proxies.txt"
        settings.proxy_list_path = candidate if candidate.is_file() else repo_root() / proxy
    return settings
