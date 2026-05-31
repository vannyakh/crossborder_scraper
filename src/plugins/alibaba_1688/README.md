---
id: "1688"
kind: source_plugin
name: 1688.com
category: ecommerce
category_label: E-commerce scrape
icon: database
summary: Scrape 1688.com product listings, variants, and supplier metadata.
tags: [1688, ecommerce, china]
links:
  - label: App Store
    path: /store
  - label: Products catalog
    path: /artifact/products
---

# 1688 source plugin

Built-in scrape plugin for 1688 product pages.

## Enable

1. Open **App Store** → find **1688**
2. Click **Enable** (registers in `config/plugins.yaml`)
3. Confirm status shows **running** in the plugin drawer

## Requirements

- Valid session cookies for 1688 when pages require login
- Run `crossborder login 1688` on the host for cookie capture

## Development

| File | Role |
|------|------|
| `manifest.py` | Catalog metadata + scrape spec |
| `scraper.py` | Playwright + HTML parsing |
| `__init__.py` | Exports `MANIFEST`, `SCRAPE_SPEC`, `SCRAPER` |

After editing, restart the API — discovery reloads the package automatically.
