"""Install agent skills from ZIP archives (OpenClaw-style SKILL.md packages)."""

from __future__ import annotations

import shutil
import zipfile
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from typing import Any

from gateway.skills.manager import get_skill_manager
from gateway.skills.manifest import load_skill_file


class SkillInstallError(ValueError):
    """Raised when a skill package fails validation."""


_MAX_ZIP_BYTES = 2_097_152
_MAX_FILES = 16


def _safe_zip_name(name: str) -> str:
    name = name.replace("\\", "/").lstrip("/")
    if ".." in name.split("/"):
        raise SkillInstallError(f"unsafe path in archive: {name}")
    return name


def extract_skill_zip(data: bytes, dest: Path) -> Path:
    if len(data) > _MAX_ZIP_BYTES:
        raise SkillInstallError(f"archive exceeds {_MAX_ZIP_BYTES} bytes")

    dest = dest.resolve()
    dest.mkdir(parents=True, exist_ok=True)
    skill_md_path: Path | None = None

    with zipfile.ZipFile(BytesIO(data)) as zf:
        members = [i for i in zf.infolist() if not i.is_dir()]
        if len(members) > _MAX_FILES:
            raise SkillInstallError(f"archive has more than {_MAX_FILES} files")

        for info in members:
            safe = _safe_zip_name(info.filename)
            if safe.endswith("/"):
                continue
            target = (dest / safe).resolve()
            if not str(target).startswith(str(dest)):
                raise SkillInstallError(f"path escapes skill directory: {info.filename}")
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(info) as src, target.open("wb") as out:
                out.write(src.read())
            if target.name == "SKILL.md":
                skill_md_path = target

    if skill_md_path is None:
        # flat zip: skill_id/SKILL.md
        for candidate in dest.rglob("SKILL.md"):
            skill_md_path = candidate
            break
    if skill_md_path is None:
        raise SkillInstallError("archive must contain SKILL.md")

    return skill_md_path.parent


class SkillInstaller:
    def install_zip(self, data: bytes, *, replace: bool = False) -> dict[str, Any]:
        mgr = get_skill_manager()
        staging = mgr.installed_root / ".staging"
        if staging.exists():
            shutil.rmtree(staging, ignore_errors=True)
        staging.mkdir(parents=True)

        try:
            workspace = extract_skill_zip(data, staging)
            skill_md = workspace / "SKILL.md"
            manifest = load_skill_file(skill_md, trusted=False)
            target = mgr.installed_root / manifest.id

            if target.exists() and any(target.iterdir()) and not replace:
                raise SkillInstallError(
                    f"skill '{manifest.id}' already installed; pass replace=true to overwrite",
                )
            if target.exists():
                shutil.rmtree(target, ignore_errors=True)

            shutil.move(str(workspace), str(target))
            staging = None  # moved

            state = mgr.load_installed_state()
            plugins = state.setdefault("skills", {})
            plugins[manifest.id] = {
                "installed_at": datetime.now(UTC).isoformat(),
                "version": manifest.version,
            }
            mgr.write_installed_state(state)

            enabled = mgr.enabled_ids()
            if manifest.id not in enabled:
                mgr.toggle_skill(manifest.id, enabled=True)

            mgr.reload()
            return {
                "ok": True,
                "skill_id": manifest.id,
                "name": manifest.name,
                "version": manifest.version,
                "workspace": str(target),
                "tools": list(manifest.tools),
            }
        finally:
            if staging and staging.exists():
                shutil.rmtree(staging, ignore_errors=True)

    def uninstall(self, skill_id: str) -> dict[str, Any]:
        mgr = get_skill_manager()
        skill_id = skill_id.strip()
        builtin = mgr.builtin_dir / skill_id
        if builtin.is_dir() and (builtin / "SKILL.md").is_file():
            raise SkillInstallError("cannot uninstall built-in skill")

        target = mgr.installed_root / skill_id
        if target.exists():
            shutil.rmtree(target, ignore_errors=True)

        state = mgr.load_installed_state()
        plugins = state.get("skills") or {}
        if skill_id in plugins:
            del plugins[skill_id]
            mgr.write_installed_state(state)

        mgr.toggle_skill(skill_id, enabled=False)
        mgr.reload()
        return {"ok": True, "skill_id": skill_id, "removed": True}


def get_skill_installer() -> SkillInstaller:
    return SkillInstaller()
