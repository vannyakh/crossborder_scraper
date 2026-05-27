---
name: export-review
description: "Review and dry-run marketplace exports (Shopee, Lazada, TikTok Shop, Shopify)."
version: "1.0.0"
metadata:
  crossborder:
    emoji: "🚀"
    category: export
    tools:
      - export_listing
      - list_products
      - list_marketplaces
---

# Export review

Use before **publishing** listings to target marketplaces.

## When to use

- "export to Shopee", "publish listing", "dry run export"
- Check marketplace credentials and mapping

## Workflow

1. `list_marketplaces` — show configured integrations.
2. `list_products` if `product_id` unknown.
3. **Default `dry_run=true`** unless user explicitly says publish/live.
4. `export_listing` — summarize payload issues (title length, images, category).

## Safety

- Never publish without explicit user confirmation.
- If credentials missing, point to Settings → Marketplaces.
