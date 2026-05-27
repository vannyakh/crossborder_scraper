import json
import re
from decimal import Decimal
from typing import Any

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

from config import Settings
from core.models import ScrapedProduct, SourcePlatform


class AIExtractor:
    """
    LLM-powered product extraction from HTML.

    Supports OpenAI-compatible APIs (OpenAI, Ollama, DeepSeek, etc.)
    via AI_BASE_URL + AI_API_KEY + AI_MODEL in .env
    """

    SYSTEM_PROMPT = """You extract e-commerce product data from HTML snippets.
Return ONLY valid JSON with this schema (no markdown):
{
  "title": "string",
  "description": "string or null",
  "price": number or null,
  "currency": "CNY|USD|EUR|...",
  "images": ["url1", "url2"],
  "variants": [{"name": "string", "price": number|null, "attributes": {}}],
  "seller_name": "string or null",
  "category": "string or null",
  "attributes": {}
}
Use absolute image URLs. Ignore ads and unrelated products."""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()

    @property
    def enabled(self) -> bool:
        return self.settings.ai_enabled and bool(
            self.settings.ai_api_key or self.settings.ai_base_url
        )

    def _prepare_html(self, html: str, max_chars: int | None = None) -> str:
        max_chars = max_chars or self.settings.ai_max_html_chars
        soup = BeautifulSoup(html, "lxml")
        for tag in soup(["script", "style", "noscript", "svg", "iframe"]):
            tag.decompose()
        text = str(soup)
        if len(text) > max_chars:
            # Keep head + main body chunks
            mid = max_chars // 2
            text = text[:mid] + "\n<!-- truncated -->\n" + text[-mid:]
        return text

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def extract(
        self,
        html: str,
        url: str,
        platform: SourcePlatform,
        product_id: str,
    ) -> ScrapedProduct:
        if not self.enabled:
            raise RuntimeError("AI extraction disabled. Set AI_ENABLED=true and AI_API_KEY in .env")

        snippet = self._prepare_html(html)
        user_msg = (
            f"URL: {url}\nPlatform: {platform.value}\n"
            f"Product ID: {product_id}\n\nHTML:\n{snippet}"
        )

        payload = {
            "model": self.settings.ai_model,
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }

        headers = {"Content-Type": "application/json"}
        if self.settings.ai_api_key:
            headers["Authorization"] = f"Bearer {self.settings.ai_api_key}"

        base = self.settings.ai_base_url.rstrip("/")
        endpoint = f"{base}/chat/completions"

        async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
            resp = await client.post(endpoint, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        content = data["choices"][0]["message"]["content"]
        parsed = self._parse_json_response(content)
        return self._to_product(parsed, url, platform, product_id)

    def _parse_json_response(self, content: str) -> dict[str, Any]:
        content = content.strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\s*", "", content)
            content = re.sub(r"\s*```$", "", content)
        return json.loads(content)

    def _to_product(
        self,
        data: dict[str, Any],
        url: str,
        platform: SourcePlatform,
        product_id: str,
    ) -> ScrapedProduct:
        price = data.get("price")
        if price is not None:
            try:
                price = Decimal(str(price))
            except Exception:
                price = None

        images = data.get("images") or []
        if isinstance(images, str):
            images = [images]

        return ScrapedProduct(
            source=platform,
            source_url=url,
            source_product_id=product_id,
            title=str(data.get("title") or f"Product {product_id}"),
            description=data.get("description"),
            price=price,
            currency=str(data.get("currency") or "CNY"),
            images=[str(i) for i in images[: self.settings.max_images_per_product]],
            seller_name=data.get("seller_name"),
            category=data.get("category"),
            attributes={**(data.get("attributes") or {}), "extracted_by": "ai"},
        )

    def is_parse_incomplete(self, product: ScrapedProduct) -> bool:
        """Heuristic: CSS parse likely failed."""
        generic_titles = ("1688 Product", "Taobao Product", "AliExpress")
        bad_title = not product.title or product.title.startswith(generic_titles)
        no_price = product.price is None
        no_images = len(product.images) == 0
        return bad_title or (no_price and no_images)
