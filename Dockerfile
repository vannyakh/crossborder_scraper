FROM node:20-slim AS ui-build

WORKDIR /ui
COPY apps/web/package.json apps/web/pnpm-lock.yaml* apps/web/ /ui/
RUN corepack enable && pnpm install
RUN pnpm build

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md /app/
COPY src /app/src
COPY main.py /app/main.py
COPY config /app/config
COPY skills /app/skills
COPY libs /app/libs
COPY installed_plugins /app/installed_plugins
COPY .env.example /app/.env.example
COPY --from=ui-build /ui/dist /app/apps/web/dist
RUN mkdir -p /app/data /app/installed_skills /app/config

RUN pip install --no-cache-dir -e . \
    && python -m playwright install --with-deps chromium

EXPOSE 8000

# API server
CMD ["python", "-m", "uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "8000"]

