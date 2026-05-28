# Cross-Border — developer shortcuts (run from repo root)
.PHONY: help install sync fmt fmt-check lint lint-py lint-py-all lint-web \
	check check-ci check-all smoke \
	build build-dev build-prod build-prod-docker \
	run-dev run-dev-ui run-prod run-prod-docker \
	test test-dev test-v test-k test-file test-prod test-prod-docker \
	dev dev-api dev-ui dev-stack hooks web-build web-lint

help:
	@echo "Cross-Border — developer targets (run from repo root)"
	@echo ""
	@echo "Setup:"
	@echo "  make install            uv sync + pnpm install (web)"
	@echo "  make sync               uv sync --all-groups"
	@echo "  make hooks              install pre-commit hooks"
	@echo ""
	@echo "Build:"
	@echo "  make build-dev          deps only (no dist/) — for local dev"
	@echo "  make build-prod         production panel bundle → apps/web/dist/"
	@echo "  make build-prod-docker  docker compose + prod overlay image"
	@echo ""
	@echo "Run:"
	@echo "  make run-dev            API with reload (Vite proxy if no dist/)"
	@echo "  make run-dev-ui         Vite hot reload"
	@echo "  make run-prod           API serves built dist/ (no reload)"
	@echo "  make run-prod-docker    docker compose prod (detached)"
	@echo "  make dev                show dev stack instructions"
	@echo ""
	@echo "Test:"
	@echo "  make test-dev           pytest + import smoke (default dev gate)"
	@echo "  make test-prod          build prod + import + /health + /ui/ smoke"
	@echo "  make test-prod-docker   docker build + container health (CI parity)"
	@echo "  make test-v             verbose pytest (dev)"
	@echo "  make test-k K=foo       pytest name filter (dev)"
	@echo "  make test-file FILE=…   single test file (dev)"
	@echo ""
	@echo "Quality:"
	@echo "  make fmt                format Python (ruff) + web (prettier)"
	@echo "  make lint               ruff check + eslint"
	@echo "  make check              import smoke (quick)"
	@echo "  make check-ci           ruff + dev test (CI Python job)"
	@echo "  make check-all          format + lint + dev test + prod build"
	@echo ""
	@echo "Debug: VS Code / Cursor → Run and Debug (docs/DEVELOPMENT.md)"

install: build-dev

sync:
	uv sync --all-groups

build: build-dev

build-dev:
	bash scripts/build.sh dev

build-prod:
	bash scripts/build.sh prod

build-prod-docker:
	bash scripts/build.sh prod-docker

run-dev:
	bash scripts/run.sh dev

run-dev-ui:
	bash scripts/run.sh dev-ui

run-prod:
	bash scripts/run.sh prod

run-prod-docker:
	bash scripts/run.sh prod-docker

fmt:
	uv run ruff format src tests main.py
	uv run ruff check --fix src tests main.py
	cd apps/web && pnpm format

fmt-check:
	uv run ruff format --check src tests main.py
	cd apps/web && pnpm format:check

lint: lint-py lint-web

lint-py:
	uv run ruff check src main.py

lint-py-all:
	uv run ruff check src tests main.py

lint-web:
	cd apps/web && pnpm lint

check: smoke

check-ci: lint-py test-dev

check-all: fmt-check lint test-dev build-prod

smoke:
	bash -c 'source scripts/_lib.sh && smoke_imports'

test: test-dev

test-dev:
	bash scripts/test.sh dev

test-prod:
	bash scripts/test.sh prod

test-prod-docker:
	bash scripts/test.sh prod-docker

test-v:
	bash scripts/test.sh dev -v

test-k:
	@test -n "$(K)" || (echo "Usage: make test-k K=pattern" >&2; exit 1)
	bash scripts/test.sh dev -k "$(K)"

test-file:
	@test -n "$(FILE)" || (echo "Usage: make test-file FILE=tests/test_foo.py" >&2; exit 1)
	bash scripts/test.sh dev "$(FILE)"

web-build: build-prod

web-lint:
	cd apps/web && pnpm lint

dev: dev-stack

dev-stack:
	bash scripts/dev-stack.sh

dev-api: run-dev

dev-ui: run-dev-ui

hooks:
	uv sync --all-groups
	bash scripts/build.sh dev
	uv run pre-commit install
