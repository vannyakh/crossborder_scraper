"""MongoDB host version and apt probing."""

from __future__ import annotations

import re

from server.db_engines.platforms._apt import madison_versions, run_cmd, search_names


def probe_host_installed_version() -> str | None:
    for cli in ("mongosh", "mongo"):
        out = run_cmd([cli, "--version"])
        match = re.search(r"(\d+)\.", out)
        if match:
            return match.group(1)
    return None


def apt_probe_sources() -> tuple[list[str], list[str]]:
    return madison_versions("mongodb-org"), search_names("mongodb")


def map_apt_to_catalog(
    catalog_ids: list[str], apt_versions: list[str], names: list[str]
) -> set[str]:
    haystack = " ".join(apt_versions + names).lower()
    found: set[str] = set()
    for vid in catalog_ids:
        if re.search(rf"\b{vid}\.", haystack) or "mongodb-org" in haystack:
            found.add(vid)
    return found
