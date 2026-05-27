# CLI reference

Entry points: `python main.py`, `crossborder`, or `scraper` (same Typer app).

```bash
python main.py sites                    # List source platforms
python main.py engine                   # Workers, proxy, cookies, AI config
python main.py scrape URL [--ai] [--headed]
python main.py login SITE [--session NAME]
python main.py export URL MARKETPLACE [--scrape] [--dry-run]
python main.py batch urls.txt [--workers N] [--ai]
```

Gateway (uses HTTP API when server is running):

```bash
crossborder serve
crossborder gateway
crossborder agent "your prompt"
crossborder skills list --local
crossborder plugins
```

Shell helpers: [scripts/README.md](../scripts/README.md).
