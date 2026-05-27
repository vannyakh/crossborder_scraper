# Scraping engine

Multi-job concurrency via asyncio workers and a Playwright browser pool.

| Module | Role |
|--------|------|
| `core/engine/executor.py` | `ScrapeEngine` — job queue, batch runner |
| `core/engine/pool.py` | `BrowserPool` — shared browser, isolated contexts |
| `core/proxy.py` | `ProxyPool` — rotate from `config/proxies.txt` |
| `core/cookies.py` | `CookieManager` — per-site + named sessions |
| `core/ai/extractor.py` | `AIExtractor` — LLM fallback when CSS parse fails |

```python
import asyncio
from core.engine import ScrapeEngine, ScrapeJob
from config import get_settings

async def main():
    engine = ScrapeEngine(get_settings(), max_workers=5)
    jobs = [ScrapeJob(url="https://...", session_id="account1")]
    report = await engine.run_batch(jobs)
    print(report.success_rate)

asyncio.run(main())
```

## Why Playwright?

| Tool | Best for |
|------|----------|
| **httpx** | AliExpress public pages, API backends |
| **Playwright** | 1688, Taobao (login + dynamic pages) |
| **Official APIs** | Shopee, Lazada, TikTok Shop, Shopify — required for listing |

## Proxies

Add one proxy per line in `config/proxies.txt`. Each worker gets a rotated proxy and cookie session.

## Multi-account cookies

```bash
python main.py login 1688 --session seller_a
python main.py login 1688 --session seller_b
# Use session_id="seller_a" in ScrapeJob
```

## AI fallback

When CSS selectors break (common on 1688/Taobao):

```env
AI_ENABLED=true
AI_API_KEY=sk-...
AI_FALLBACK=true
AI_BASE_URL=https://api.openai.com/v1
# Ollama: AI_BASE_URL=http://localhost:11434/v1  AI_MODEL=llama3.2
```

```bash
python main.py scrape URL --ai
python main.py batch urls.txt --ai
```

## Production tips

- **Proxies**: set `PROXY_SERVER` in `.env` (residential recommended for Taobao).
- **Rate limits**: increase `REQUEST_DELAY_SECONDS`.
- **Legal**: respect each site's Terms of Service; use official APIs where required.
- **Selectors**: 1688/Taobao layouts change often — update `src/plugins/*/plugin.py` when parsing fails.
