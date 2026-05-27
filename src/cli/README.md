# CLI (`scraper`)

Entry: `cli.app` → `uv run scraper` or `python main.py`.

| Module | Commands |
|--------|----------|
| `commands/scrape_cmds.py` | `scrape`, `login`, `export`, `batch`, `engine`, `sites` |
| `commands/setup_cmds.py` | `setup`, `env-clean`, `serve`, `plugins` |
| `commands/gateway_cmds.py` | `gateway`, `agent`, `workflow`, `skills *`, `prompts *` |

Use `--local` on `agent` and `skills` to run without the HTTP API.
