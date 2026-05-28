"""Redis host version and apt probing."""

from __future__ import annotations

import re

from server.db_engines.platforms._apt import madison_versions, run_cmd


def probe_host_installed_version() -> str | None:
    out = run_cmd(["redis-server", "--version"])
    match = re.search(r"v=(\d+)", out) or re.search(r"(\d+)\.", out)
    return match.group(1) if match else None


def apt_probe_sources() -> tuple[list[str], list[str]]:
    return madison_versions("redis-server"), ["redis-server"]


def map_apt_to_catalog(
    catalog_ids: list[str], apt_versions: list[str], names: list[str]
) -> set[str]:
    haystack = " ".join(apt_versions + names).lower()
    found: set[str] = set()
    for vid in catalog_ids:
        if re.search(rf"\b{vid}\.", haystack) or re.search(rf"v{vid}\b", haystack):
            found.add(vid)
    return found
