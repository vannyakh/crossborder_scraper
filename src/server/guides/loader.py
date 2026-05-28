"""Load panel setup guides from libs/guides/*.md."""

from __future__ import annotations

from functools import lru_cache

from core.paths import repo_root

GUIDES_DIR = repo_root() / "libs" / "guides"


@lru_cache(maxsize=32)
def load_guide_markdown(guide_id: str) -> str:
    path = GUIDES_DIR / f"{guide_id}.md"
    if not path.is_file():
        return f"# {guide_id}\n\nSetup guide not found."
    return path.read_text(encoding="utf-8").strip()


def guide_source_path(guide_id: str) -> str:
    return f"libs/guides/{guide_id}.md"
