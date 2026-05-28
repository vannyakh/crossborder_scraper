"""Panel setup guides — markdown under libs/guides/."""

from server.guides.catalog import GUIDE_CATALOG, list_guide_ids
from server.guides.loader import guide_source_path, load_guide_markdown

__all__ = [
    "GUIDE_CATALOG",
    "guide_source_path",
    "list_guide_ids",
    "load_guide_markdown",
]
