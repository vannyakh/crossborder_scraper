"""Browse and download SKILL.md packages from a public skill registry (ClawHub-compatible API)."""

from __future__ import annotations

import os
from typing import Any, Literal
from urllib.parse import quote

import httpx

DEFAULT_REGISTRY_URL = "https://clawhub.ai"
REGISTRY_TIMEOUT = 30.0
USER_AGENT = "crossborder-scraper-panel/1.0"

RegistryKind = Literal["skill", "plugin"]
RegistrySort = Literal["downloads", "updated", "newest", "stars", "installs"]


class SkillRegistryError(RuntimeError):
    """Registry HTTP or payload error."""


def registry_base_url() -> str:
    raw = os.environ.get("CROSSBORDER_SKILL_REGISTRY_URL", DEFAULT_REGISTRY_URL).strip().rstrip("/")
    return raw or DEFAULT_REGISTRY_URL


def registry_skill_url(slug: str) -> str:
    return f"{registry_base_url()}/skills/{quote(slug, safe='')}"


def registry_plugin_url(name: str) -> str:
    slug = name.lstrip("@").replace("/", "-")
    return f"{registry_base_url()}/plugins/{quote(slug, safe='')}"


def _map_skill_row(raw: dict[str, Any], *, local_ids: set[str], enabled: set[str]) -> dict[str, Any]:
    slug = str(raw.get("slug") or "").strip()
    stats = raw.get("stats") if isinstance(raw.get("stats"), dict) else {}
    latest = raw.get("latestVersion") if isinstance(raw.get("latestVersion"), dict) else {}
    version = str(latest.get("version") or raw.get("tags", {}).get("latest") or "1.0.0")
    return {
        "slug": slug,
        "name": str(raw.get("displayName") or slug),
        "description": str(raw.get("summary") or ""),
        "version": version,
        "kind": "skill",
        "family": "skill",
        "owner_handle": str((raw.get("owner") or {}).get("handle") or ""),
        "downloads": int(stats.get("downloads") or 0),
        "stars": int(stats.get("stars") or 0),
        "executes_code": False,
        "is_official": False,
        "registry_url": registry_skill_url(slug),
        "installed": slug in local_ids,
        "enabled": slug in enabled,
    }


def _map_plugin_row(raw: dict[str, Any], *, local_ids: set[str], enabled: set[str]) -> dict[str, Any]:
    name = str(raw.get("name") or "").strip()
    runtime_id = str(raw.get("runtimeId") or name).strip()
    slug = runtime_id or name.lstrip("@").replace("/", "-")
    return {
        "slug": slug,
        "name": str(raw.get("displayName") or name or slug),
        "description": str(raw.get("summary") or ""),
        "version": str(raw.get("latestVersion") or "1.0.0"),
        "kind": "plugin",
        "family": str(raw.get("family") or "code-plugin"),
        "owner_handle": str(raw.get("ownerHandle") or ""),
        "downloads": 0,
        "stars": 0,
        "executes_code": bool(raw.get("executesCode")),
        "is_official": bool(raw.get("isOfficial")),
        "registry_url": registry_plugin_url(name or slug),
        "installed": slug in local_ids or runtime_id in local_ids,
        "enabled": slug in enabled or runtime_id in enabled,
    }


async def _get_json(
    client: httpx.AsyncClient,
    path: str,
    *,
    params: dict[str, Any] | None = None,
) -> Any:
    url = f"{registry_base_url()}{path}"
    resp = await client.get(url, params=params)
    if resp.status_code >= 400:
        detail = resp.text[:240].strip()
        raise SkillRegistryError(f"registry request failed ({resp.status_code}): {detail}")
    return resp.json()


async def browse_registry(
    *,
    kind: RegistryKind = "skill",
    sort: RegistrySort = "downloads",
    limit: int = 24,
    cursor: str | None = None,
    q: str | None = None,
    local_ids: set[str] | None = None,
    enabled: set[str] | None = None,
) -> dict[str, Any]:
    local = local_ids or set()
    enabled_set = enabled or set()
    safe_limit = max(1, min(limit, 100))
    query = (q or "").strip()

    headers = {"User-Agent": USER_AGENT}
    async with httpx.AsyncClient(timeout=REGISTRY_TIMEOUT, headers=headers) as client:
        if kind == "skill":
            if query:
                data = await _get_json(client, "/api/v1/search", params={"q": query, "limit": safe_limit})
                items = [
                    _map_skill_row(
                        {
                            "slug": row.get("slug"),
                            "displayName": row.get("displayName"),
                            "summary": row.get("summary"),
                            "latestVersion": {"version": row.get("version")},
                            "stats": {},
                            "owner": row.get("owner") or {"handle": row.get("ownerHandle")},
                        },
                        local_ids=local,
                        enabled=enabled_set,
                    )
                    for row in data.get("results") or []
                    if row.get("slug")
                ]
                return {"items": items, "next_cursor": None, "registry_url": registry_base_url()}

            params: dict[str, Any] = {"limit": safe_limit, "sort": sort}
            if cursor:
                params["cursor"] = cursor
            data = await _get_json(client, "/api/v1/skills", params=params)
            items = [
                _map_skill_row(row, local_ids=local, enabled=enabled_set)
                for row in data.get("items") or []
                if row.get("slug")
            ]
            return {
                "items": items,
                "next_cursor": data.get("nextCursor"),
                "registry_url": registry_base_url(),
            }

        if query:
            data = await _get_json(
                client,
                "/api/v1/packages/search",
                params={"q": query, "limit": safe_limit, "family": "code-plugin"},
            )
            items = [
                _map_plugin_row(row.get("package") or {}, local_ids=local, enabled=enabled_set)
                for row in data.get("results") or []
                if (row.get("package") or {}).get("name")
            ]
            return {"items": items, "next_cursor": None, "registry_url": registry_base_url()}

        params = {"limit": safe_limit, "family": "code-plugin"}
        if cursor:
            params["cursor"] = cursor
        data = await _get_json(client, "/api/v1/packages", params=params)
        items = [
            _map_plugin_row(row, local_ids=local, enabled=enabled_set)
            for row in data.get("items") or []
            if row.get("family") in ("code-plugin", "bundle-plugin")
        ]
        return {
            "items": items,
            "next_cursor": data.get("nextCursor"),
            "registry_url": registry_base_url(),
        }


async def fetch_registry_skill_detail(slug: str) -> dict[str, Any]:
    slug = slug.strip()
    if not slug:
        raise SkillRegistryError("skill slug is required")

    headers = {"User-Agent": USER_AGENT}
    async with httpx.AsyncClient(timeout=REGISTRY_TIMEOUT, headers=headers) as client:
        data = await _get_json(client, f"/api/v1/skills/{slug}")
    skill = data.get("skill") if isinstance(data.get("skill"), dict) else data
    latest = data.get("latestVersion") if isinstance(data.get("latestVersion"), dict) else {}
    owner = data.get("owner") if isinstance(data.get("owner"), dict) else {}
    version = str(latest.get("version") or skill.get("tags", {}).get("latest") or "1.0.0")
    return {
        "slug": slug,
        "name": str(skill.get("displayName") or slug),
        "description": str(skill.get("summary") or ""),
        "version": version,
        "changelog": str(latest.get("changelog") or ""),
        "license": str(latest.get("license") or ""),
        "owner_handle": str(owner.get("handle") or ""),
        "registry_url": registry_skill_url(slug),
        "stats": skill.get("stats") if isinstance(skill.get("stats"), dict) else {},
    }


async def download_registry_skill(*, slug: str, version: str | None = None) -> bytes:
    slug = slug.strip()
    if not slug:
        raise SkillRegistryError("skill slug is required")

    params: dict[str, str] = {"slug": slug}
    if version:
        params["version"] = version.strip()

    headers = {"User-Agent": USER_AGENT}
    url = f"{registry_base_url()}/api/v1/download"
    async with httpx.AsyncClient(timeout=REGISTRY_TIMEOUT, headers=headers, follow_redirects=True) as client:
        resp = await client.get(url, params=params)
        if resp.status_code >= 400:
            detail = resp.text[:240].strip()
            raise SkillRegistryError(f"skill download failed ({resp.status_code}): {detail}")
        data = resp.content
        if len(data) > 5_242_880:
            raise SkillRegistryError("registry skill archive exceeds size limit")
        return data
