"""Push short alerts to Telegram control chats (cron summaries, etc.)."""

from __future__ import annotations

from typing import Any

import httpx
from loguru import logger

from gateway.integrate.runners.telegram.config import load_telegram_config


async def send_control_chat_message(text: str, *, max_chars: int = 3500) -> dict[str, Any]:
    """Send a plain-text message to all configured Telegram control chat ids."""
    cfg = load_telegram_config()
    if not cfg.get("enabled"):
        return {"ok": False, "error": "Telegram integrate channel is disabled"}
    token = str(cfg.get("bot_token") or "").strip()
    if not token:
        return {"ok": False, "error": "Telegram bot token is not configured"}
    chat_ids = cfg.get("control_chat_ids") or []
    if not chat_ids:
        return {"ok": False, "error": "No Telegram control chat ids configured"}

    body = (text or "").strip()[:max_chars]
    if not body:
        return {"ok": False, "error": "Empty message"}

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    sent: list[int | str] = []
    errors: list[str] = []
    async with httpx.AsyncClient(timeout=20.0) as client:
        for chat_id in chat_ids:
            try:
                resp = await client.post(
                    url,
                    json={"chat_id": chat_id, "text": body, "disable_web_page_preview": True},
                )
                resp.raise_for_status()
                sent.append(chat_id)
            except Exception as exc:
                logger.warning("Telegram notify to {} failed: {}", chat_id, exc)
                errors.append(f"{chat_id}: {exc}")

    if not sent:
        return {"ok": False, "error": "; ".join(errors) or "delivery failed"}
    return {"ok": True, "sent_to": sent, "errors": errors or None}
