"""Load gateway agent system prompts from libs/prompts/*.md."""

from __future__ import annotations

import re

from core.paths import prompts_dir

PROMPTS_DIR = prompts_dir()
DEFAULT_PROMPT_ID = "gateway_agent"

_FALLBACK_PROMPT = """You are the Cross-Border gateway agent.
Use available tools to scrape, list, export, and report status. Be concise."""

_BUILTIN_IDS = frozenset(
    {
        "gateway_agent",
        "telegram_agent",
        "catalog_monitor",
        "scrape_ops",
        "export_review",
    }
)


def _prompt_label(prompt_id: str, text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("# "):
            return stripped.lstrip("#").strip()
        match = re.search(r"\*\*([^*]+)\*\*", stripped)
        if match and stripped.lower().startswith("you are"):
            title = match.group(1).strip()
            return title[:72]
    return prompt_id.replace("_", " ").title()


def _prompt_kind(prompt_id: str) -> str:
    if prompt_id == "gateway_agent":
        return "role"
    return "task"


def list_prompts() -> list[dict[str, str | bool]]:
    items: list[dict[str, str | bool]] = []
    if not PROMPTS_DIR.is_dir():
        return items
    for path in sorted(PROMPTS_DIR.glob("*.md")):
        if path.name.upper() == "README.MD":
            continue
        prompt_id = path.stem
        text = path.read_text(encoding="utf-8").strip()
        items.append(
            {
                "id": prompt_id,
                "label": _prompt_label(prompt_id, text),
                "path": f"libs/prompts/{path.name}",
                "recommended": prompt_id in _BUILTIN_IDS,
                "kind": _prompt_kind(prompt_id),
            }
        )
    return items


def load_prompt(prompt_id: str | None = None) -> tuple[str, str]:
    pid = (prompt_id or DEFAULT_PROMPT_ID).strip()
    path = PROMPTS_DIR / f"{pid}.md"
    if not path.is_file():
        fallback = PROMPTS_DIR / f"{DEFAULT_PROMPT_ID}.md"
        if fallback.is_file():
            return DEFAULT_PROMPT_ID, fallback.read_text(encoding="utf-8").strip()
        return pid, _FALLBACK_PROMPT
    return pid, path.read_text(encoding="utf-8").strip()
