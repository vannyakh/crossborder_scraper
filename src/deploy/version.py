"""Installed vs remote version checks for panel software updates."""

from __future__ import annotations

import json
import re
import subprocess
import urllib.error
import urllib.request
from dataclasses import dataclass

from core.paths import repo_root

DEFAULT_GITHUB_REPO = "vannyakh/crossborder_scraper"
_VERSION_RE = re.compile(r"^v?(\d+(?:\.\d+)*)")


@dataclass(frozen=True)
class UpdateCheckResult:
    current_version: str
    latest_version: str | None
    update_available: bool
    release_url: str | None = None
    release_notes: str | None = None
    source: str = "none"  # github | git | none
    git_commits_behind: int = 0
    git_branch: str | None = None
    check_error: str | None = None


def parse_version_tuple(version: str) -> tuple[int, ...]:
    raw = version.strip().lstrip("v")
    match = _VERSION_RE.match(raw)
    if not match:
        return (0,)
    parts: list[int] = []
    for segment in match.group(1).split("."):
        try:
            parts.append(int(segment))
        except ValueError:
            break
    return tuple(parts) or (0,)


def version_gt(a: str, b: str) -> bool:
    return parse_version_tuple(a) > parse_version_tuple(b)


def _fetch_github_latest(repo: str) -> tuple[str | None, str | None, str | None, str | None]:
    url = f"https://api.github.com/repos/{repo}/releases/latest"
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "crossborder-scraper-panel",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        tag = str(data.get("tag_name") or "").lstrip("v") or None
        html_url = data.get("html_url")
        body = data.get("body")
        notes = (str(body).strip()[:2000] if body else None) or None
        return tag, html_url, notes, None
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return _fetch_github_main_tag(repo)
        return None, None, None, f"github: HTTP {exc.code}"
    except (urllib.error.URLError, OSError, json.JSONDecodeError, TimeoutError) as exc:
        return None, None, None, f"github: {exc}"


def _fetch_github_main_tag(repo: str) -> tuple[str | None, str | None, str | None, str | None]:
    """Fallback when no GitHub releases exist — read version from main pyproject.toml."""
    raw_url = f"https://raw.githubusercontent.com/{repo}/main/pyproject.toml"
    req = urllib.request.Request(raw_url, headers={"User-Agent": "crossborder-scraper-panel"})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            text = resp.read().decode("utf-8", errors="replace")
        match = re.search(r'^version\s*=\s*"([^"]+)"', text, re.MULTILINE)
        if match:
            ver = match.group(1)
            return ver, f"https://github.com/{repo}", None, None
        return None, None, None, "github: no version in pyproject.toml"
    except (urllib.error.URLError, OSError, TimeoutError) as exc:
        return None, None, None, f"github: {exc}"


def _git_commits_behind() -> tuple[int, str | None, str | None]:
    root = repo_root()
    if not (root / ".git").is_dir():
        return 0, None, None
    try:
        subprocess.run(
            ["git", "-C", str(root), "fetch", "--quiet", "origin"],
            capture_output=True,
            timeout=30,
            check=False,
        )
        branch_proc = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            check=False,
        )
        branch = (branch_proc.stdout or "").strip() or "main"
        behind_proc = subprocess.run(
            ["git", "-C", str(root), "rev-list", "--count", f"HEAD..origin/{branch}"],
            capture_output=True,
            text=True,
            check=False,
        )
        if behind_proc.returncode != 0:
            behind_proc = subprocess.run(
                ["git", "-C", str(root), "rev-list", "--count", "HEAD..@{u}"],
                capture_output=True,
                text=True,
                check=False,
            )
        behind = int((behind_proc.stdout or "0").strip() or "0")
        return behind, branch, None
    except (subprocess.TimeoutExpired, OSError, ValueError) as exc:
        return 0, None, str(exc)


def check_for_update(
    *,
    current_version: str,
    github_repo: str | None = None,
) -> UpdateCheckResult:
    repo = github_repo or DEFAULT_GITHUB_REPO
    errors: list[str] = []

    latest_ver: str | None = None
    release_url: str | None = None
    release_notes: str | None = None
    source = "none"

    gh_ver, gh_url, gh_notes, gh_err = _fetch_github_latest(repo)
    if gh_err:
        errors.append(gh_err)
    if gh_ver:
        latest_ver = gh_ver
        release_url = gh_url
        release_notes = gh_notes
        source = "github"

    behind, branch, git_err = _git_commits_behind()
    if git_err:
        errors.append(f"git: {git_err}")

    version_update = bool(latest_ver and version_gt(latest_ver, current_version))
    git_update = behind > 0
    update_available = version_update or git_update

    if git_update and not version_update and latest_ver is None:
        source = "git"

    return UpdateCheckResult(
        current_version=current_version,
        latest_version=latest_ver,
        update_available=update_available,
        release_url=release_url,
        release_notes=release_notes,
        source=source,
        git_commits_behind=behind,
        git_branch=branch,
        check_error="; ".join(errors) if errors else None,
    )
