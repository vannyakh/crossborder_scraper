# Crossborder Scraper — developer shortcuts (run from repo root)
.PHONY: help install sync fmt fmt-check lint lint-py lint-py-all lint-web check check-ci check-all test dev-api dev-ui hooks smoke

help:
	@echo "Targets:"
	@echo "  make install     uv sync --all-groups + pnpm install (web)"
	@echo "  make sync        uv sync --all-groups"
	@echo "  make fmt         format Python (ruff) + web (prettier)"
	@echo "  make fmt-check   verify formatting (CI)"
	@echo "  make lint        ruff check + eslint"
	@echo "  make check       import smoke (quick gate)"
	@echo "  make check-ci    ruff src + smoke (intended CI)"
	@echo "  make check-all   format check + full lint + tests"
	@echo "  make test        pytest"
	@echo "  make dev-api     API with reload (scripts/serve-api.sh)"
	@echo "  make dev-ui      Vite panel (scripts/dev-ui.sh)"
	@echo "  make hooks       install pre-commit hooks"

install: sync
	cd apps/web && pnpm install

sync:
	uv sync --all-groups

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

check-ci: lint-py smoke

check-all: fmt-check lint smoke test

smoke:
	uv run python -c "from cli.app import app; from server.app import app as api"

test:
	uv run pytest tests/ -q

dev-api:
	bash scripts/serve-api.sh

dev-ui:
	bash scripts/dev-ui.sh

hooks:
	uv sync --all-groups
	cd apps/web && pnpm install
	uv run pre-commit install
