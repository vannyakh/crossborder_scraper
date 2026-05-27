# CLI (`scraper`)

Entry: `cli.app` → `uv run scraper` or `python main.py`.

| Module | Commands |
|--------|----------|
| `commands/scrape_cmds.py` | `scrape`, `login`, `export`, `batch`, `engine`, `sites` |
| `commands/setup_cmds.py` | `setup`, `env-clean`, `serve`, `plugins` |
| `commands/deploy_cmds.py` | `deploy setup`, `up`, `down`, `systemd`, `nginx`, `status` |
| `commands/gateway_cmds.py` | `gateway`, `agent`, `workflow`, `skills *`, `prompts *` |

**Self-host:** `scraper setup --server` then `scraper deploy up` (Docker) or `scraper deploy systemd`. See [docs/SELF_HOSTING.md](../../docs/SELF_HOSTING.md).

Use `--local` on `agent` and `skills` to run without the HTTP API.
