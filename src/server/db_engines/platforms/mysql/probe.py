"""MySQL host version and apt probing."""

from __future__ import annotations

import re

from server.db_engines.platforms._apt import madison_versions, run_cmd, search_names


def probe_host_installed_version() -> str | None:
    out = run_cmd(["mysql", "--version"])
    match = re.search(r"(\d+\.\d+\.\d+)", out)
    if not match:
        return None
    if "5.7" in out:
        return "5.7"
    return match.group(1).split(".")[0]


def apt_probe_sources() -> tuple[list[str], list[str]]:
    return madison_versions("mysql-server"), search_names("^mysql-server")


def map_apt_to_catalog(
    catalog_ids: list[str], apt_versions: list[str], names: list[str]
) -> set[str]:
    haystack = " ".join(apt_versions + names).lower()
    found: set[str] = set()
    for vid in catalog_ids:
        if vid == "8" and re.search(r"\b8[\.\-]", haystack):
            found.add(vid)
        if vid == "5.7" and "5.7" in haystack:
            found.add(vid)
    return found
