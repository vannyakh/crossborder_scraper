---
name: batch-ops
description: "Submit and monitor concurrent scrape batches (multiple URLs)."
version: "1.0.0"
metadata:
  crossborder:
    emoji: "📦"
    category: scrape
    tools:
      - submit_batch
      - runtime_status
      - list_products
---

# Batch operations

Use for **many URLs**, worker tuning, and batch progress.

## When to use

- User provides a list of links or a file of URLs
- "scrape these in parallel", "batch scrape with N workers"

## Workflow

1. Collect URLs (dedupe, max ~50 per request unless user confirms more).
2. Call `submit_batch` with `workers` 3–5 by default; `use_ai` only if requested.
3. Return `batch_id` and tell the user to open **Live monitor** or poll `runtime_status`.
4. After completion, use `list_products` to show recent rows if helpful.

## Tips

- Heavy sites (1688/Taobao): lower workers, mention cookie sessions.
- AliExpress: often works without login.
