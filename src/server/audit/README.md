# Service audit logs (`server/audit/`)

Append-only logs for panel **operations**, scrape **runs**, and agent **cron** jobs.

- Module: `service_logs.py`
- File: `data/service_logs.jsonl` (`LOGS_PATH`)

Not product SQLite (`pipeline/storage.py`) and not the Docker App Store (`server/app_store/`).
