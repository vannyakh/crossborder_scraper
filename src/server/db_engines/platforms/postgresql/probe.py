"""PostgreSQL host version and apt probing."""

from __future__ import annotations

import re

from server.db_engines.platforms._apt import madison_versions, run_cmd, search_names


def probe_host_installed_version() -> str | None:
    out = run_cmd(["psql", "--version"])
    match = re.search(r"(\d+)", out)
    return match.group(1) if match else None


def apt_probe_sources() -> tuple[list[str], list[str]]:
    names = search_names("^postgresql-[0-9]+$")
    versions: list[str] = []
    for name in names:
        versions.extend(madison_versions(name))
    return versions, names


def map_apt_to_catalog(
    catalog_ids: list[str], apt_versions: list[str], names: list[str]
) -> set[str]:
    haystack = " ".join(apt_versions + names).lower()
    found: set[str] = set()
    for vid in catalog_ids:
        if re.search(rf"postgresql-{re.escape(vid)}\b", haystack) or re.search(
            rf"\b{vid}\.", haystack
        ):
            found.add(vid)
    return found
