# Contributing to Crossborder Scraper

Thanks for helping improve the scraper panel, API, and plugins. This guide covers setup, formatting, and how we organize the repo.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [uv](https://docs.astral.sh/uv/) | latest | Python deps & scripts |
| [pnpm](https://pnpm.io/) | 9.x | React panel (`apps/web`) |
| Node.js | 20+ | Vite / ESLint / Prettier |
| Python | 3.12+ | Backend |

Optional: [pre-commit](https://pre-commit.com/) (installed via `uv` dev group).

## First-time setup

From the repository root:

```bash
make install
uv run playwright install chromium
cp .env.example .env
cp config/ui_config.example.json config/ui_config.json
crossborder setup
```

Enable git hooks (recommended):

```bash
make hooks
```

Uses **Ruff** + **pre-commit’s bundled Prettier** (no `node_modules` required to commit). Run `cd apps/web && pnpm install` for local `pnpm dev` / ESLint.

## Repository layout

| Path | Role |
|------|------|
| `src/` | Python: CLI, server, core, plugins, gateway, deploy |
| `apps/web/` | React panel (Vite + TypeScript) |
| `config/` | Runtime YAML/JSON on disk |
| `libs/` | Prompts, agent rules, store driver scripts |
| `tests/` | Pytest |
| `docs/` | Guides |

Full map: [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

## Formatting & linting

We use **Ruff** for Python and **Prettier + ESLint** for the web app. Line length is **100** (see `.editorconfig` and `pyproject.toml`).

```bash
make fmt          # auto-format everything
make lint         # ruff + eslint (no fixes)
make check        # quick import smoke
make check-ci     # ruff on src + smoke (GitHub CI)
make check-all    # format + full lint + pytest
make fmt          # auto-format before opening a PR
make test         # pytest
```

Per area:

```bash
uv run ruff format src tests main.py
uv run ruff check --fix src tests main.py
cd apps/web && pnpm format && pnpm lint
```

## VS Code / Cursor

Open the repo root as the workspace folder. Recommended extensions are listed in `.vscode/extensions.json` — accept the prompt to install them.

Workspace settings (`.vscode/settings.json`) enable:

- Format on save (Ruff for Python, Prettier for TS/TSX)
- ESLint in `apps/web`
- Python path `src/` for analysis
- Tasks: **Terminal → Run Task** → `Check: format + lint (all)`, `Dev: API server`, etc.
- Debug: **API: uvicorn (reload)** under Run and Debug

## Pull requests

1. Branch from `main`.
2. Run `make check` (and `make check-ci` / `make test` when you touch backend logic).
3. Keep changes focused; match existing naming and patterns.
4. Use product terms from [.cursor/rules/crossborder-product.mdc](.cursor/rules/crossborder-product.mdc) in user-facing strings (panel, VPS, host firewall — not third-party panel vendor names).
5. Describe **what** and **why** in the PR; include screenshots for UI changes.

## CI

GitHub Actions runs on push/PR to `main`: Python ruff + format check, web build/lint, Docker smoke. See [.github/workflows/ci.yml](.github/workflows/ci.yml).

## Questions

- Development workflow: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **Cursor / coding agents:** [AGENTS.md](AGENTS.md) + `.cursor/rules/`
- API & scraping: [docs/README.md](docs/README.md)
