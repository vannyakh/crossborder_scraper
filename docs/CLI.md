# CLI reference

Entry points: `python main.py`, `crossborder`, or `scraper` (same Typer app).

## Service (panel API)

```bash
crossborder service start          # background (data/panel.log)
crossborder service start -f         # foreground
crossborder service stop
crossborder service restart
crossborder service status
crossborder service logs -f
crossborder serve --no-reload        # foreground (same process)
crossborder deploy run --setup       # VPS first run + foreground
```

## Gateway agent

```bash
crossborder gateway                  # control-plane status
crossborder agent "your instruction" # one-shot agent run
crossborder agent "…" --session ID   # multi-turn via session
crossborder chat                     # interactive REPL
crossborder chat sessions list
crossborder discover tools           # tool catalog
crossborder discover workflows
crossborder runs list
```

## Skills, rules, schedules

```bash
crossborder skills list [--local]
crossborder skills enable ID…
crossborder skills disable ID…
crossborder skills set ID…           # replace enabled set
crossborder rules list [--local]
crossborder rules enable|disable|set ID…
crossborder schedules list
crossborder schedules create NAME CRON "message"
crossborder schedules update ID --cron "*/5 * * * *"
crossborder schedules run ID
crossborder schedules delete ID
```

## Integrate channels

```bash
crossborder channels list            # or: crossborder integrate list
crossborder channels show telegram
crossborder channels configure telegram --enable --json '{"bot_token":"…"}'
crossborder channels reload telegram
```

## Scrape

```bash
crossborder scrape URL [--ai] [--headed]
crossborder batch urls.txt [--workers N]
crossborder export URL MARKETPLACE [--dry-run]
crossborder plugins
crossborder sites
```

## Hosting & maintenance

```bash
crossborder setup                    # panel credentials
crossborder install                  # full server bootstrap
crossborder deploy status
crossborder deploy setup-access      # VPS bind + firewall + public IP
crossborder tools sync               # git pull + deps
crossborder tools update             # sync + restart panel
```

Use `--local` on agent/skills/rules/schedules/channels to read or write config on disk without a running API.

Shell helpers: [scripts/README.md](../scripts/README.md).
