---
id: ollama
kind: store_service
name: Ollama
category: ai
category_label: AI runtime
icon: brain
summary: Local LLM runtime for gateway agent workflows without cloud API keys.
tags: [llm, ai, local]
links:
  - label: AI provider settings
    path: /settings/ai
  - label: Agent chat
    path: /agent/chat
---

# Ollama

Run open models on your VPS and point the gateway agent at a local API endpoint.

## Install (native)

On a Linux VPS, the App Store runs the official installer:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Cross-Border configures `ollama.service` and binds to `127.0.0.1:11434` by default.

## Install (Docker)

Use **Docker** in the App Store when you prefer a container stack. Models persist in the `ollama_data` volume.

## After install

1. Pull a model: `ollama pull llama3.2`
2. Open **Settings → AI** and select provider **Ollama**
3. Set base URL to `http://127.0.0.1:11434` (or your mapped port)
4. Probe models from the settings page before using Agent chat

## Troubleshooting

- **Port in use** — pick another port in the install dialog or stop the conflicting service.
- **Empty model list** — pull at least one model on the host (`ollama list`).
- **Agent cannot reach Ollama** — confirm the panel host can curl `/api/tags` on the configured port.
