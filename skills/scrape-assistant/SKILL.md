---
name: scrape-assistant
description: "Scrape single product URLs from 1688, Taobao, AliExpress, and enabled source plugins."
version: "1.0.0"
metadata:
  crossborder:
    emoji: "🛒"
    category: scrape
    tools:
      - scrape_product
      - list_products
      - runtime_status
---

# Scrape assistant

Use when the user wants to **fetch one product** or check scrape engine health.

## When to use

- "scrape this URL", "get product from 1688/Taobao/AliExpress"
- "what's running on the scraper?", engine/batch status

## Workflow

1. Confirm the URL and site (1688 needs cookies; mention login if failures).
2. Call `scrape_product` with `save=true` unless the user only wants a preview.
3. Set `use_ai=true` when CSS extraction may fail or the user asks for AI.
4. Summarize title, price, image count, and `product_id` from the tool result.

## Do not

- Invent prices, SKUs, or images not returned by tools.
- Export to marketplaces unless the user asks (use export-review skill).
