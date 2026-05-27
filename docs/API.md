# Web API

Run locally from repo root:

```bash
uv run serve
# or: uv run python -m uvicorn server.app:app --host 0.0.0.0 --port 8000
```

If `uvicorn: command not found`, run `deactivate`, then `uv sync`, then `uv run serve`.

## Endpoints

- `GET /health` · `GET /config` · `GET /stats`
- **Jobs:** `POST /jobs/submit` · `POST /jobs/scrape` · `GET /jobs/{id}/status` · `GET /jobs/{id}/result` · `POST /jobs/{id}/cancel`
- **Batches:** `GET /batches` · `GET /batches/{id}`
- **Products:** `GET /products` · `GET /products/{id}` · `DELETE /products/{id}` · `POST /products/export`
- **Files:** `GET /files` · `GET /files/{path}` · `DELETE /files/{path}`
- **Gateway:** `/gateway/*` — agent tools and chat

## Example

```bash
curl -X POST "http://localhost:8000/jobs/submit" \
  -H "content-type: application/json" \
  -d '{"urls":["https://detail.1688.com/offer/XXX.html"],"workers":3,"use_ai":false,"save":true}'
```

Panel UI is served at `/ui/` when the production build exists in `apps/web/dist`.
