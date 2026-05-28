# Local development

## Quick reference

### Development

| Goal | Command |
|------|---------|
| Install deps (no prod bundle) | `make build-dev` or `make install` |
| Dev stack instructions | `make dev` |
| API with reload | `make run-dev` |
| Vite panel (hot reload) | `make run-dev-ui` |
| Dev tests (pytest + smoke) | `make test-dev` |
| CI parity (ruff + dev test) | `make check-ci` |

### Production (local)

| Goal | Command |
|------|---------|
| Build panel bundle | `make build-prod` → `apps/web/dist/` |
| Run prod-like API | `make run-prod` (serves `dist/`, no reload) |
| Prod smoke test | `make test-prod` (build + `/health` + `/ui/`) |
| Docker prod image | `make build-prod-docker` |
| Run Docker prod | `make run-prod-docker` |
| Docker smoke test | `make test-prod-docker` (CI parity) |

### Scripts (same as Make targets)

```bash
bash scripts/build.sh dev|prod|docker|prod-docker
bash scripts/run.sh dev|dev-ui|prod|prod-docker
bash scripts/test.sh dev|prod|prod-docker
```

## Dev stack (API + panel)

**Terminal 1 — API:**

```bash
make run-dev
```

**Terminal 2 — Vite (hot reload):**

```bash
make run-dev-ui
```

Default port comes from `PANEL_PORT` in `.env` (8787 in `.env.example`).

| URL | When |
|-----|------|
| `http://127.0.0.1:<PANEL_PORT>/ui/` | API (proxies to Vite when `dist/` is missing) |
| `http://127.0.0.1:5173/ui/` | Vite dev server (fastest UI iteration) |

**502 on `/health`:** start `make run-dev` and restart Vite.

## Production-like local run

Build once, then run without Vite or reload:

```bash
make build-prod
make run-prod
# → http://127.0.0.1:<PANEL_PORT>/ui/
```

Verify the full prod path:

```bash
make test-prod
```

Docker (matches deployed container):

```bash
make build-prod-docker
make run-prod-docker
make test-prod-docker   # build image + container /health
```

## VS Code / Cursor

**Terminal → Run Task** (or `Cmd+Shift+B`):

| Task | Purpose |
|------|---------|
| **Dev: full stack (API + Vite)** | Default build task — both dev servers |
| **Build: prod (panel bundle)** | `apps/web/dist/` |
| **Run: prod (static bundle)** | API without reload |
| **Test: dev** | pytest + import smoke |
| **Test: prod** | build + HTTP smoke |
| **Test: prod-docker** | container health (needs Docker) |
| **Check: CI parity** | ruff + dev test |

**Run and Debug:** API reload, CLI, pytest (current file / last failed / `-k` filter).

**Testing sidebar:** pytest discovers `tests/` automatically.

## Tests

**Development** (fast, daily):

```bash
make test-dev                         # pytest + import smoke
make test-v                           # verbose pytest
make test-k K=gateway                 # name filter
make test-file FILE=tests/test_foo.py
bash scripts/test.sh dev -- -x -v     # raw pytest args
```

**Production** (before release / deploy):

```bash
make test-prod          # build dist + import smoke + /health + /ui/
make test-prod-docker   # docker build + container health
```

Pytest config: `pyproject.toml`. Fixtures: `tests/conftest.py`.

## Formatting & quality

```bash
make install      # build-dev
make hooks        # pre-commit
make fmt          # auto-format
make lint         # ruff + eslint
make check        # import smoke only
make check-ci     # ruff + test-dev
make check-all    # format + lint + test-dev + build-prod
```

## CI

On push/PR to `main`:

| Job | What runs |
|-----|-----------|
| Python | ruff + `test-dev` |
| Web | `pnpm build` |
| Docker | buildx image + `test-prod-docker` smoke |

See [.github/workflows/ci.yml](../.github/workflows/ci.yml) and [.github/RELEASE.md](../.github/RELEASE.md).

Contributor guide: [CONTRIBUTING.md](../CONTRIBUTING.md)

Cursor / IDE agents: [AGENTS.md](../AGENTS.md) and `.cursor/rules/`.
