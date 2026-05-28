# Gateway tool catalog

Tools the gateway agent can call — **schemas**, required fields, and categories.

## 1. Open the catalog

**Debug → Tool catalog** lists every gateway tool with description and JSON schema.

## 2. Filter and search

Use category chips (scrape, export, status, …) or search by name. Select a tool to read required parameters.

## 3. Common tools

| Tool | Purpose |
|------|---------|
| `scrape_product` | Scrape a single product URL |
| `submit_batch` | Queue multiple URLs |
| `list_products` | Browse saved catalog rows |
| `export_listing` | Export to a marketplace |
| `runtime_status` | Engine and batch snapshot |

## 4. Agent invocation

During chat or cron, the LLM chooses tools automatically. Skills can restrict which tools are exposed.
