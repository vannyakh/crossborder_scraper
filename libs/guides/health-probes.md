# Health and readiness

Engine status, **agent LLM probe**, and Support readiness checks.

## 1. Health page

**Health** shows scrape engine uptime, active tasks, and gateway agent LLM connectivity.

## 2. Probe agent LLM

Run **Test connection** on **Settings → Agent LLM** (draft settings) or **Health** (saved config).

## 3. Support checks

**Support** lists scheduler, database, output dir, cookies, and gateway agent LLM readiness in one grid.

## When something fails

| Symptom | Check |
|---------|--------|
| Agent chat disabled | Settings → Agent LLM enabled + API key |
| LLM probe timeout | Base URL, firewall, provider status |
| Scheduler not OK | Gateway cron loop / server logs |
