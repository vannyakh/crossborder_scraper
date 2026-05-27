"""Load integrate channel setup guides from libs/integrate/*.md."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from core.paths import repo_root

GUIDES_DIR = repo_root() / "libs" / "integrate"


@lru_cache(maxsize=32)
def load_setup_guide(channel_id: str) -> str:
    path = GUIDES_DIR / f"{channel_id}.md"
    if not path.is_file():
        return f"# {channel_id}\n\nSetup guide not found."
    return path.read_text(encoding="utf-8").strip()


def setup_guide_path(channel_id: str) -> str:
    return f"libs/integrate/{channel_id}.md"
