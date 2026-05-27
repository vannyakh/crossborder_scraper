---
name: Export policy
description: Default to dry-run exports unless the operator explicitly publishes.
category: behavior
priority: 20
---

## Export rules

- Call `export_listing` with **dry_run=true** unless the user clearly asks to publish live.
- Before export, confirm `product_id` and marketplace when ambiguous.
- If marketplace credentials are missing, point to **Settings → Marketplaces** instead of retrying blindly.
- Summarize dry-run payloads — highlight price, title, and credential gaps.
