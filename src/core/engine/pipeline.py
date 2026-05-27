"""Unified scrape pipeline — same stage order for engine, gateway tools, and agent."""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any

from loguru import logger

from config import Settings
from core.ai import AIExtractor, ScrapeAgent
from core.base_scraper import BaseScraper
from core.engine.jobs import ScrapeJob
from core.engine.pool import BrowserPool
from core.models import ScrapedProduct
from core.plugins import require_scraper_for_url
from core.proxy import ProxyConfig


class ScrapePhase(StrEnum):
    """Ordered stages aligned with ARCHITECTURE.md business flow."""

    RESOLVE_SOURCE = "resolve_source"
    FETCH = "fetch"
    PARSE = "parse"
    AI_EXTRACT = "ai_extract"
    AGENT_ENRICH = "agent_enrich"
    COMPLETE = "complete"
    FAILED = "failed"


@dataclass
class PhaseEvent:
    phase: ScrapePhase
    at: datetime = field(default_factory=datetime.utcnow)
    duration_ms: float | None = None
    detail: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "phase": self.phase.value,
            "at": self.at.isoformat() + "Z",
            "duration_ms": self.duration_ms,
            "detail": self.detail,
        }


PhaseCallback = Callable[[PhaseEvent], Awaitable[None] | None]


@dataclass
class PipelineOutcome:
    product: ScrapedProduct | None = None
    phases: list[PhaseEvent] = field(default_factory=list)
    ai_extract_used: bool = False
    agent_used: bool = False
    error: str | None = None
    site_key: str | None = None
    proxy_label: str | None = None

    @property
    def ai_used(self) -> bool:
        return self.ai_extract_used or self.agent_used


async def _notify(on_phase: PhaseCallback | None, event: PhaseEvent) -> None:
    if not on_phase:
        return
    result = on_phase(event)
    if result is not None and hasattr(result, "__await__"):
        await result


async def _record(
    outcome: PipelineOutcome,
    on_phase: PhaseCallback | None,
    event: PhaseEvent,
) -> None:
    outcome.phases.append(event)
    await _notify(on_phase, event)


async def run_scrape_pipeline(
    job: ScrapeJob,
    *,
    settings: Settings,
    pool: BrowserPool,
    ai: AIExtractor,
    agent: ScrapeAgent,
    worker_id: int = 0,
    proxy: ProxyConfig | None = None,
    on_phase: PhaseCallback | None = None,
) -> PipelineOutcome:
    """
    Execute scrape → optional AI extract → optional agent enrich in fixed order.

    Matches gateway workflow: source URL → structured product → listing-ready copy.
    """
    outcome = PipelineOutcome(proxy_label=proxy.server if proxy else None)
    use_ai = job.use_ai if job.use_ai is not None else settings.ai_enabled
    html = ""
    scraper: BaseScraper | None = None

    try:
        t0 = time.perf_counter()
        scraper = require_scraper_for_url(job.url)
        site_key = job.site_key or scraper.site_key
        outcome.site_key = site_key
        await _record(
            outcome,
            on_phase,
            PhaseEvent(
                phase=ScrapePhase.RESOLVE_SOURCE,
                duration_ms=round((time.perf_counter() - t0) * 1000, 1),
                detail={
                    "plugin_id": scraper.site_key,
                    "platform": scraper.platform.value,
                    "sandboxed": bool(getattr(scraper, "sandboxed", False)),
                },
            ),
        )

        if getattr(scraper, "sandboxed", False):
            t_fetch = time.perf_counter()
            product = await scraper.scrape_product(job.url)
            await _record(
                outcome,
                on_phase,
                PhaseEvent(
                    phase=ScrapePhase.FETCH,
                    duration_ms=round((time.perf_counter() - t_fetch) * 1000, 1),
                    detail={"mode": "sandbox_plugin"},
                ),
            )
            await _record(
                outcome,
                on_phase,
                PhaseEvent(phase=ScrapePhase.PARSE, detail={"mode": "sandbox_plugin"}),
            )
        else:
            t_fetch = time.perf_counter()
            async with pool.page_session(
                site_key=site_key,
                worker_id=worker_id,
                proxy=proxy,
                session_id=job.session_id,
            ) as (page, _ctx):
                html = await scraper.fetch_page(page, job.url)
                await _record(
                    outcome,
                    on_phase,
                    PhaseEvent(
                        phase=ScrapePhase.FETCH,
                        duration_ms=round((time.perf_counter() - t_fetch) * 1000, 1),
                        detail={"bytes": len(html)},
                    ),
                )

                t_parse = time.perf_counter()
                product = await scraper.parse_html(job.url, html)
                if settings.output_dir:
                    raw = scraper._save_raw_html(job.url, html)
                    product.raw_html_path = str(raw)
                await _record(
                    outcome,
                    on_phase,
                    PhaseEvent(
                        phase=ScrapePhase.PARSE,
                        duration_ms=round((time.perf_counter() - t_parse) * 1000, 1),
                        detail={"title": (product.title or "")[:80]},
                    ),
                )

        incomplete = ai.is_parse_incomplete(product)
        force_extract = job.use_ai is True
        need_extract = (
            use_ai
            and ai.enabled
            and html
            and (force_extract or (settings.ai_fallback and incomplete))
        )

        if need_extract:
            logger.info("[{}] AI extraction for {}", job.id, job.url)
            t_ai = time.perf_counter()
            product = await ai.extract(
                html,
                job.url,
                scraper.platform,
                scraper.extract_product_id(job.url) or "unknown",
            )
            outcome.ai_extract_used = True
            await _record(
                outcome,
                on_phase,
                PhaseEvent(
                    phase=ScrapePhase.AI_EXTRACT,
                    duration_ms=round((time.perf_counter() - t_ai) * 1000, 1),
                    detail={"reason": "forced" if force_extract else "fallback"},
                ),
            )
            incomplete = ai.is_parse_incomplete(product)

        if agent.enabled and (outcome.ai_extract_used or incomplete):
            logger.info("[{}] AI agent validate/enrich for {}", job.id, job.url)
            t_agent = time.perf_counter()
            product = await agent.validate_and_enrich(product)
            outcome.agent_used = True
            agent_meta = (product.attributes or {}).get("ai_agent") or {}
            await _record(
                outcome,
                on_phase,
                PhaseEvent(
                    phase=ScrapePhase.AGENT_ENRICH,
                    duration_ms=round((time.perf_counter() - t_agent) * 1000, 1),
                    detail={
                        "valid": agent_meta.get("valid"),
                        "confidence": agent_meta.get("confidence"),
                    },
                ),
            )

        outcome.product = product
        await _record(
            outcome,
            on_phase,
            PhaseEvent(phase=ScrapePhase.COMPLETE, detail={"ai_used": outcome.ai_used}),
        )
        return outcome

    except Exception as exc:
        logger.error("[{}] Pipeline failed: {} — {}", job.id, job.url, exc)
        await _record(
            outcome,
            on_phase,
            PhaseEvent(phase=ScrapePhase.FAILED, detail={"error": str(exc)}),
        )
        outcome.error = str(exc)
        return outcome
