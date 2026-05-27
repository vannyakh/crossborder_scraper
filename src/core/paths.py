"""Repository path helpers — single source of truth for layout on disk."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def repo_root() -> Path:
    """Project root (directory that contains ``src/``, ``config/``, ``apps/``)."""
    return Path(__file__).resolve().parents[2]


def src_dir() -> Path:
    return repo_root() / "src"


def apps_web_dir() -> Path:
    return repo_root() / "apps" / "web"


def ui_dist_dir() -> Path:
    return apps_web_dir() / "dist"


def config_dir() -> Path:
    """Runtime YAML/JSON (``plugins.yaml``, ``ui_config.json``) — not the Python ``config`` package."""
    return repo_root() / "config"


def data_dir() -> Path:
    return repo_root() / "data"


def installed_plugins_dir() -> Path:
    return repo_root() / "installed_plugins"


def builtin_plugins_dir() -> Path:
    return src_dir() / "plugins"


def plugins_config_path() -> Path:
    return config_dir() / "plugins.yaml"


def prompts_dir() -> Path:
    return repo_root() / "libs" / "prompts"


def builtin_skills_dir() -> Path:
    return repo_root() / "skills"


def installed_skills_dir() -> Path:
    return repo_root() / "installed_skills"


def agent_skills_config_path() -> Path:
    return config_dir() / "agent_skills.yaml"


def env_file_path() -> Path:
    return repo_root() / ".env"
