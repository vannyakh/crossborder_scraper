"""System slash commands — gateway status, schedules, rules, stop."""

from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from gateway.integrate.runners.telegram.auth import is_authorized
from gateway.integrate.runners.telegram.config import load_telegram_config
from gateway.integrate.runners.telegram.reply import send_text
from gateway.integrate.runners.telegram.runs import chat_runs


async def _require_auth(update: Update) -> bool:
    cfg = load_telegram_config()
    if not cfg.get("enabled"):
        await send_text(update, "Telegram integrate channel is disabled in the panel.")
        return False
    if not is_authorized(update, cfg):
        await send_text(
            update,
            "Unauthorized. Send /getid, add the chat id under Integrate → Telegram, save, "
            "then try again.",
        )
        return False
    return True


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _require_auth(update):
        return
    from server.services.gateway_service import get_gateway_service

    st = get_gateway_service().get_status()
    runtime = st.get("runtime") or {}
    engine = runtime.get("engine") or {}
    ai = runtime.get("ai") or {}
    lines = [
        f"Gateway: {st.get('service')} v{st.get('version')}",
        f"Tools: {st.get('tools_count')}  Skills: {st.get('enabled_skills_count')}/"
        f"{st.get('skills_count')}",
        f"Schedules: {st.get('enabled_schedules_count')}/{st.get('schedules_count')}",
        f"Engine jobs: {engine.get('max_concurrent_jobs')} max · "
        f"{len(runtime.get('running_batches') or [])} running batches",
        f"Agent LLM: {'on' if ai.get('ai_enabled') else 'off'} · model={ai.get('ai_model') or '—'}",
    ]
    await send_text(update, "\n".join(lines))


async def cmd_schedules(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _require_auth(update):
        return
    from server.services.gateway_service import get_gateway_service

    items = get_gateway_service().list_schedules()
    if not items:
        await send_text(
            update,
            "No cron schedules. Ask the agent to create one or use Agent → Schedules.",
        )
        return
    lines = ["Cron schedules:", ""]
    for row in items[:15]:
        flag = "on" if row.get("enabled", True) else "off"
        notify = " · telegram alert" if row.get("notify_telegram") else ""
        lines.append(
            f"• {row.get('name')} [{flag}]{notify}\n  {row.get('cron')} · id {row.get('id')}"
        )
    await send_text(update, "\n".join(lines))


async def cmd_rules(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _require_auth(update):
        return
    from gateway.rules import get_rule_manager

    mgr = get_rule_manager()
    enabled = mgr.enabled_ids()
    lines = ["Enabled agent rules:", ""]
    for row in mgr.list_catalog():
        if row.get("id") not in enabled:
            continue
        lines.append(f"• {row.get('id')} — {row.get('name')}")
    if len(lines) <= 2:
        lines.append("(none — check Agent → Rules in the panel)")
    await send_text(update, "\n".join(lines))


async def cmd_stop(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _require_auth(update):
        return
    chat = update.effective_chat
    if chat is None:
        return
    if chat_runs.cancel(chat.id):
        await send_text(update, "Stopping the current agent run for this chat.")
    else:
        await send_text(update, "No agent run in progress for this chat.")
