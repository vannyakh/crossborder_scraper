---
id: scrape-assistant
kind: skill
name: Scrape assistant
category: scrape
category_label: Scrape
icon: shopping-cart
summary: Fetch single product URLs and report scrape engine health via gateway tools.
tags: [scrape, product, catalog]
links:
  - label: Agent skills
    path: /agent/skills
  - label: Batch queue
    path: /workflow/batches
---

# Scrape assistant

Built-in gateway skill for single-URL scrapes and runtime checks.

## Tools included

- `scrape_product` — fetch and optionally save one listing
- `list_products` — browse the local catalog
- `runtime_status` — engine and batch health

## Enable

Open **Agent → Skills**, toggle **Scrape assistant** on, and confirm it appears in the enabled list. Enabled skills inject their playbook into the gateway agent system prompt.

## Operator notes

- Ask the agent to scrape with an explicit URL; it should call `scrape_product` before claiming success.
- 1688 often needs valid cookies — mention login if scrapes fail.
- For bulk URL lists, enable **batch-ops** instead.

## Runtime package

Agent instructions live in `skills/scrape-assistant/SKILL.md`. This guide covers panel setup; the skill body controls agent behavior at runtime.
