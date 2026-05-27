# Releasing Crossborder Scraper

## Version bump

1. Update version in **`pyproject.toml`** (`[project].version`).
2. Match **`apps/web/package.json`** `version` (optional but recommended).
3. Commit: `chore: release v0.2.0`

## Tag & push

```bash
git tag v0.2.0
git push origin v0.2.0
```

The **Release** workflow (`.github/workflows/release.yml`) will:

- Verify the tag matches `pyproject.toml`
- Run Python lint (Ruff) and build the web client (same checks as CI)
- Build multi-arch Docker image and push to **GHCR**: `ghcr.io/<owner>/crossborder_scraper:<version>`
- Smoke-test the published image (`/health` on port 8787)
- Create a **GitHub Release** with install notes (triggers **Deploy** workflow when it completes)

## CI

Every push/PR to `main` runs **CI** (Ruff, web build, Docker build smoke test).

## Deploy

### Manual (Actions tab)

1. Open **Actions → Deploy → Run workflow**
2. Set **version** (e.g. `0.1.0` or `latest`)
3. Enable **Run SSH deploy** if server secrets are configured

### VPS with Docker Compose

```bash
export CROSSBORDER_IMAGE=ghcr.io/YOUR_ORG/crossborder_scraper:0.1.0
docker compose -f docker-compose.release.yml pull
docker compose -f docker-compose.release.yml up -d
```

### Optional GitHub secrets (SSH deploy)

| Secret | Description |
|--------|-------------|
| `DEPLOY_SSH_HOST` | Server hostname or IP |
| `DEPLOY_SSH_USER` | SSH user |
| `DEPLOY_SSH_KEY` | Private key (PEM) |
| `DEPLOY_PATH` | Install dir on server (default `/opt/crossborder-scraper`) |
| `DEPLOY_SSH_PORT` | SSH port (default `22`) |

## Package visibility

After first release, set **Packages → crossborder_scraper → Package settings** to public if you want anonymous `docker pull` without auth.
