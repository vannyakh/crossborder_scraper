"""Persisted project settings — visibility, variables, members, and API tokens."""

from __future__ import annotations

import json
import secrets
import uuid
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from typing import Any, Literal

from core.paths import data_dir

ProjectVisibility = Literal["private", "workspace"]
VariableScope = Literal["project", "shared"]

DEFAULT_VISIBILITY: ProjectVisibility = "private"


def settings_dir() -> Path:
    return data_dir() / "projects" / "_settings"


def _settings_path(project_id: str) -> Path:
    safe = project_id.replace("/", "-").replace("..", "")
    return settings_dir() / f"{safe}.json"


def _now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _today() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%d")


def _read_raw(project_id: str) -> dict[str, Any]:
    path = _settings_path(project_id)
    if not path.exists():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    return raw if isinstance(raw, dict) else {}


def _write_raw(project_id: str, data: dict[str, Any]) -> None:
    path = _settings_path(project_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def delete_project_settings(project_id: str) -> bool:
    path = _settings_path(project_id)
    if not path.exists():
        return False
    path.unlink()
    return True


def default_settings(*, owner_username: str = "admin") -> dict[str, Any]:
    return {
        "visibility": DEFAULT_VISIBILITY,
        "variables": [
            {"key": "CROSSBORDER_WWWROOT", "scope": "shared", "masked": False, "value": ""},
        ],
        "members": [
            {
                "id": str(uuid.uuid4()),
                "name": owner_username or "Panel admin",
                "role": "Owner",
                "username": owner_username or "admin",
            }
        ],
        "tokens": [],
    }


def ensure_project_settings(project_id: str, *, owner_username: str = "admin") -> dict[str, Any]:
    existing = _read_raw(project_id)
    if existing:
        return existing
    data = default_settings(owner_username=owner_username)
    _write_raw(project_id, data)
    return data


def load_project_settings(project_id: str) -> dict[str, Any]:
    return ensure_project_settings(project_id)


def save_project_settings(project_id: str, data: dict[str, Any]) -> dict[str, Any]:
    _write_raw(project_id, data)
    return data


def patch_project_settings(
    project_id: str,
    *,
    visibility: ProjectVisibility | None = None,
    variables: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    data = load_project_settings(project_id)
    if visibility is not None:
        data["visibility"] = visibility
    if variables is not None:
        data["variables"] = variables
    return save_project_settings(project_id, data)


def _token_prefix(raw: str) -> str:
    return f"cbp_{raw[:4]}…{raw[-4:]}"


def create_project_token(project_id: str, *, label: str) -> tuple[dict[str, Any], str]:
    data = load_project_settings(project_id)
    raw = secrets.token_urlsafe(24)
    token_id = str(uuid.uuid4())
    entry = {
        "id": token_id,
        "label": label.strip() or "API token",
        "prefix": _token_prefix(raw),
        "token_hash": sha256(raw.encode()).hexdigest(),
        "created_at": _today(),
    }
    tokens = list(data.get("tokens") or [])
    tokens.insert(0, entry)
    data["tokens"] = tokens[:20]
    save_project_settings(project_id, data)
    return entry, raw


def revoke_project_token(project_id: str, token_id: str) -> bool:
    data = load_project_settings(project_id)
    tokens = list(data.get("tokens") or [])
    kept = [row for row in tokens if str(row.get("id")) != token_id]
    if len(kept) == len(tokens):
        return False
    data["tokens"] = kept
    save_project_settings(project_id, data)
    return True


def verify_project_token(project_id: str, raw_token: str) -> dict[str, Any] | None:
    """Return the stored token row when ``raw_token`` matches a project API token hash."""
    token = (raw_token or "").strip()
    if len(token) < 16:
        return None
    data = load_project_settings(project_id)
    digest = sha256(token.encode()).hexdigest()
    for row in data.get("tokens") or []:
        stored = str(row.get("token_hash") or "")
        if stored and secrets.compare_digest(stored, digest):
            return row
    return None
