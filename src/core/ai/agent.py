import json
import re
from decimal import Decimal
from typing import Any

import httpx
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from config import Settings
from core.models import ScrapedProduct


class ScrapeAgent:
    """
    Post-extraction AI pipeline: validate scraped data and enrich listing copy.
    """

    SYSTEM_PROMPT = """You validate and improve cross-border e-commerce product data.
Return ONLY valid JSON (no markdown):
{
  "valid": true,
  "issues": ["optional list of data quality issues"],
  "title": "clear English listing title",
  "description": "marketplace-ready product description in English",
  "confidence": 0.95
}
Rules:
- valid=false if title is generic/empty, price and images are both missing, or data looks like a captcha/error page.
- Always return improved title and description even when valid=false.
- Keep factual details; do not invent specs not present in the input."""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()

    @property
    def enabled(self) -> bool:
        return (
            self.settings.ai_enabled
            and self.settings.ai_agent_enabled
            and bool(self.settings.ai_api_key or self.settings.ai_base_url)
        )

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.settings.ai_api_key:
            headers["Authorization"] = f"Bearer {self.settings.ai_api_key}"
        return headers

    def _parse_json(self, content: str) -> dict[str, Any]:
        content = content.strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\s*", "", content)
            content = re.sub(r"\s*```$", "", content)
        return json.loads(content)

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def validate_and_enrich(self, product: ScrapedProduct) -> ScrapedProduct:
        if not self.enabled:
            return product

        payload = {
            "model": self.settings.ai_model,
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "url": product.source_url,
                            "platform": product.source.value,
                            "title": product.title,
                            "description": product.description,
                            "price": str(product.price) if product.price is not None else None,
                            "currency": product.currency,
                            "images": product.images[:5],
                            "category": product.category,
                            "seller_name": product.seller_name,
                            "attributes": product.attributes,
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }

        base = self.settings.ai_base_url.rstrip("/")
        async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
            resp = await client.post(
                f"{base}/chat/completions",
                headers=self._headers(),
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        parsed = self._parse_json(data["choices"][0]["message"]["content"])
        enriched = product.model_copy(deep=True)
        attrs = dict(enriched.attributes)

        if parsed.get("title"):
            enriched.title = str(parsed["title"]).strip()
        if parsed.get("description"):
            enriched.description = str(parsed["description"]).strip()

        attrs["ai_agent"] = {
            "valid": bool(parsed.get("valid", True)),
            "issues": parsed.get("issues") or [],
            "confidence": parsed.get("confidence"),
        }
        enriched.attributes = attrs

        if not parsed.get("valid", True):
            logger.warning(
                "AI agent flagged low-quality product {}: {}",
                product.source_url,
                attrs["ai_agent"]["issues"],
            )

        return enriched
