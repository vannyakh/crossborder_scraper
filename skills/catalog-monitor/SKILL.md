---
name: catalog-monitor
description: "Monitor scraped product catalog health, gaps, and stale listings."
version: "1.0.0"
metadata:
  crossborder:
    emoji: "📊"
    category: catalog
    tools:
      - list_products
      - runtime_status
---

# Catalog monitor

Use for **inventory review**, scheduled checks, and catalog hygiene.

## When to use

- "how many products do we have?", "latest scrapes"
- Scheduled cron: "daily catalog check"

## Workflow

1. `list_products` with a sensible limit (10–25).
2. `runtime_status` for engine and running batches.
3. Report: count, sources, missing images/prices, failed batches.
4. Suggest re-scrape or export next steps.

## Alerts

- Flag products with empty `images` or `price`.
- Note if AI enrichment is off but data looks incomplete.
