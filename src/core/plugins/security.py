"""Validation and policy checks for third-party plugin packages."""

from __future__ import annotations

import ast
import json
import re
import zipfile
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
from typing import TYPE_CHECKING, Any

from core.plugins.spec import ScrapeCategory, parse_scrape_spec

if TYPE_CHECKING:
    from core.plugins.spec import EcommerceScrapeSpec

PLUGIN_ID_RE = re.compile(r"^[a-z][a-z0-9_]{1,48}$")

# Modules that must not appear in untrusted plugin code unless permission granted.
_ALLOWED_IMPORT_ROOTS = frozenset(
    {
        "core",
        "bs4",
        "re",
        "json",
        "decimal",
        "datetime",
        "typing",
        "dataclasses",
        "enum",
        "urllib",
        "asyncio",
        "loguru",
    }
)

_BLOCKED_IMPORT_ROOTS = frozenset(
    {
        "subprocess",
        "ctypes",
        "multiprocessing",
        "socket",
        "pickle",
        "marshal",
        "builtins",
        "importlib",
        "pty",
        "fcntl",
        "resource",
        "signal",
        "sys",
        "shutil",
        "pathlib",
        "tempfile",
        "glob",
        "ftplib",
        "smtplib",
        "http",
        "urllib",
        "requests",
        "httpx",
        "aiohttp",
        "playwright",
        "selenium",
    }
)

_BLOCKED_CALLS = frozenset({"eval", "exec", "compile", "__import__", "open", "input", "breakpoint"})

# Playwright/browser stack is provided by the host engine — plugins use BaseScraper helpers.
_BROWSER_IMPORTS = frozenset({"playwright", "selenium", "pyppeteer"})

_NETWORK_IMPORTS = frozenset(
    {
        "socket",
        "ssl",
        "http",
        "urllib",
        "requests",
        "httpx",
        "aiohttp",
        "websockets",
    }
)


@dataclass(frozen=True)
class PluginPermissions:
    network: bool = False
    browser: bool = False
    filesystem: bool = False
    subprocess: bool = False

    @classmethod
    def from_dict(cls, raw: dict[str, Any] | None) -> PluginPermissions:
        raw = raw or {}
        return cls(
            network=bool(raw.get("network")),
            browser=bool(raw.get("browser")),
            filesystem=bool(raw.get("filesystem")),
            subprocess=bool(raw.get("subprocess")),
        )

    def to_dict(self) -> dict[str, bool]:
        return {
            "network": self.network,
            "browser": self.browser,
            "filesystem": self.filesystem,
            "subprocess": self.subprocess,
        }


@dataclass(frozen=True)
class InstalledPluginManifest:
    id: str
    name: str
    version: str
    description: str
    category: ScrapeCategory
    domains: tuple[str, ...]
    entry_module: str
    entry_class: str
    permissions: PluginPermissions
    trusted: bool = False
    tags: tuple[str, ...] = field(default_factory=tuple)
    scrape_spec: EcommerceScrapeSpec | None = None

    @classmethod
    def from_dict(cls, raw: dict[str, Any], *, trusted: bool = False) -> InstalledPluginManifest:
        plugin_id = str(raw.get("id") or "").strip().lower()
        if not PLUGIN_ID_RE.match(plugin_id):
            raise ValueError("manifest id must match [a-z][a-z0-9_]{1,48}")

        domains_raw = raw.get("domains") or []
        if not isinstance(domains_raw, list) or not domains_raw:
            raise ValueError("manifest domains must be a non-empty list")
        domains = tuple(str(d).strip().lower() for d in domains_raw if str(d).strip())
        if not domains:
            raise ValueError("manifest domains cannot be empty")

        category = str(raw.get("category") or "custom").strip().lower()
        if category not in ("social", "custom", "ecommerce"):
            raise ValueError("manifest category must be social, ecommerce, or custom")

        scrape_spec = parse_scrape_spec(raw.get("scrape_spec"))
        if category == "ecommerce" and scrape_spec is None:
            raise ValueError("ecommerce plugins require scrape_spec in manifest.json")

        entry_module = str(raw.get("entry_module") or "plugin").strip()
        entry_class = str(raw.get("entry_class") or "").strip()
        if not entry_class or not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", entry_class):
            raise ValueError("manifest entry_class must be a valid Python class name")
        if not re.match(r"^[a-z][a-z0-9_]*$", entry_module):
            raise ValueError("manifest entry_module must be a simple module name")

        manifest = cls(
            id=plugin_id,
            name=str(raw.get("name") or plugin_id),
            version=str(raw.get("version") or "0.0.0"),
            description=str(raw.get("description") or ""),
            category=category,  # type: ignore[arg-type]
            domains=domains,
            entry_module=entry_module,
            entry_class=entry_class,
            permissions=PluginPermissions.from_dict(raw.get("permissions")),
            trusted=trusted,
            tags=tuple(str(t) for t in (raw.get("tags") or [])),
            scrape_spec=scrape_spec,
        )
        return manifest

    def to_catalog_dict(self, *, installed: bool, status: str) -> dict[str, Any]:
        row: dict[str, Any] = {
            "id": self.id,
            "kind": "source",
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "version": self.version,
            "default_port": 0,
            "supports_docker": False,
            "supports_external": False,
            "docker_image": "",
            "tags": list(self.tags),
            "connection_fields": [],
            "domains": list(self.domains),
            "installed": installed,
            "enabled": installed,
            "status": status,
            "mode": "source" if installed else None,
            "trusted": self.trusted,
            "permissions": self.permissions.to_dict(),
            "sandboxed": not self.trusted,
        }
        if self.scrape_spec:
            row["scrape_spec"] = self.scrape_spec.to_dict()
        return row


@dataclass
class SecurityPolicy:
    max_zip_bytes: int = 5_242_880
    max_files_in_zip: int = 32
    max_plugin_py_bytes: int = 262_144
    scrape_timeout_seconds: int = 120
    trusted_builtin_ids: frozenset[str] = frozenset(
        {"instagram", "tiktok", "linkedin", "custom_plugin"},
    )

    @classmethod
    def from_config(cls, raw: dict[str, Any] | None) -> SecurityPolicy:
        raw = raw or {}
        trusted = raw.get("trusted_builtin_ids") or []
        return cls(
            max_zip_bytes=int(raw.get("max_zip_bytes", 5_242_880)),
            max_files_in_zip=int(raw.get("max_files_in_zip", 32)),
            max_plugin_py_bytes=int(raw.get("max_plugin_py_bytes", 262_144)),
            scrape_timeout_seconds=int(raw.get("scrape_timeout_seconds", 120)),
            trusted_builtin_ids=frozenset(str(x) for x in trusted),
        )


class PluginSecurityError(ValueError):
    """Raised when a plugin fails validation."""


def load_manifest_file(path: Path) -> InstalledPluginManifest:
    if not path.is_file():
        raise PluginSecurityError(f"missing manifest: {path.name}")
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise PluginSecurityError(f"invalid manifest JSON: {exc}") from exc
    if not isinstance(raw, dict):
        raise PluginSecurityError("manifest must be a JSON object")
    return InstalledPluginManifest.from_dict(raw)


def _import_root(name: str) -> str:
    return name.split(".", 1)[0]


def validate_python_source(
    source: str,
    *,
    permissions: PluginPermissions,
    filename: str = "<plugin>",
) -> list[str]:
    """Static AST scan for disallowed constructs in untrusted plugins."""
    issues: list[str] = []
    try:
        tree = ast.parse(source, filename=filename)
    except SyntaxError as exc:
        raise PluginSecurityError(f"syntax error in {filename}: {exc}") from exc

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = _import_root(alias.name)
                issues.extend(_check_import(root, permissions, filename))
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root = _import_root(node.module)
                issues.extend(_check_import(root, permissions, filename))
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in _BLOCKED_CALLS:
                if node.func.id == "open" and permissions.filesystem:
                    continue
                issues.append(f"{filename}: disallowed call '{node.func.id}'")
            elif isinstance(node.func, ast.Attribute) and node.func.attr in _BLOCKED_CALLS:
                issues.append(f"{filename}: disallowed call '.{node.func.attr}'")

    return issues


def _check_import(root: str, permissions: PluginPermissions, filename: str) -> list[str]:
    issues: list[str] = []
    if root in _ALLOWED_IMPORT_ROOTS:
        return issues
    if root in _BLOCKED_IMPORT_ROOTS:
        if root == "shutil" and permissions.filesystem:
            return issues
        if root in _BROWSER_IMPORTS and permissions.browser:
            return issues
        if root in _NETWORK_IMPORTS and permissions.network:
            return issues
        if root == "subprocess" and permissions.subprocess:
            return issues
        issues.append(f"{filename}: blocked import '{root}'")
    return issues


def _safe_zip_name(name: str) -> str:
    name = name.replace("\\", "/").lstrip("/")
    if name.startswith("../") or "/../" in name or name.startswith("/"):
        raise PluginSecurityError(f"unsafe path in archive: {name}")
    parts = Path(name).parts
    if parts and parts[0] == "..":
        raise PluginSecurityError(f"unsafe path in archive: {name}")
    return name


def extract_zip_safely(
    data: bytes,
    dest: Path,
    *,
    policy: SecurityPolicy,
) -> list[Path]:
    """Extract zip to dest with size limits and zip-slip protection."""
    if len(data) > policy.max_zip_bytes:
        raise PluginSecurityError(f"archive exceeds {policy.max_zip_bytes} bytes")

    dest = dest.resolve()
    dest.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    with zipfile.ZipFile(BytesIO(data)) as zf:
        members = [i for i in zf.infolist() if not i.is_dir()]
        if len(members) > policy.max_files_in_zip:
            raise PluginSecurityError(f"archive has more than {policy.max_files_in_zip} files")

        for info in members:
            safe_name = _safe_zip_name(info.filename)
            if safe_name.endswith("/"):
                continue
            target = (dest / safe_name).resolve()
            if not str(target).startswith(str(dest)):
                raise PluginSecurityError(f"path escapes plugin directory: {info.filename}")

            suffix = target.suffix.lower()
            if suffix not in {".py", ".json", ".txt", ".md"} and safe_name != "manifest.json":
                raise PluginSecurityError(f"disallowed file type in archive: {safe_name}")

            if suffix == ".py" and info.file_size > policy.max_plugin_py_bytes:
                raise PluginSecurityError(f"file too large: {safe_name}")

            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(info) as src, target.open("wb") as out:
                out.write(src.read())
            written.append(target)

    return written


def validate_plugin_workspace(
    workspace: Path,
    *,
    policy: SecurityPolicy,
    permissions: PluginPermissions | None = None,
) -> InstalledPluginManifest:
    """Validate extracted plugin directory before registration."""
    workspace = workspace.resolve()
    manifest_path = workspace / "manifest.json"
    manifest = load_manifest_file(manifest_path)

    if (workspace / "requirements.txt").exists():
        raise PluginSecurityError(
            "requirements.txt is not allowed; dependencies must be vendored or use host APIs",
        )

    plugin_py = workspace / f"{manifest.entry_module}.py"
    if not plugin_py.is_file():
        raise PluginSecurityError(f"missing entry module {manifest.entry_module}.py")

    perms = permissions or manifest.permissions
    issues: list[str] = []
    for py_file in workspace.rglob("*.py"):
        rel = py_file.relative_to(workspace)
        if ".." in rel.parts:
            raise PluginSecurityError(f"invalid path: {rel}")
        if py_file.stat().st_size > policy.max_plugin_py_bytes:
            raise PluginSecurityError(f"file too large: {rel}")
        source = py_file.read_text(encoding="utf-8")
        issues.extend(validate_python_source(source, permissions=perms, filename=str(rel)))

    if issues:
        raise PluginSecurityError("; ".join(issues[:8]) + ("..." if len(issues) > 8 else ""))

    return manifest


def assert_url_allowed(url: str, domains: tuple[str, ...]) -> None:
    from urllib.parse import urlparse

    host = urlparse(url).netloc.lower().replace("www.", "")
    if not host:
        raise PluginSecurityError("invalid URL")
    if not any(domain in host for domain in domains):
        raise PluginSecurityError(f"URL host not allowed for plugin domains: {host}")
