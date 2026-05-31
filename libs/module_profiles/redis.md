---
id: redis
kind: store_service
name: Redis
category: cache
category_label: Cache
icon: circle-dot
summary: In-memory cache and message broker for sessions, queues, and rate limits.
tags: [cache, queue]
links:
  - label: App Store
    path: /store
  - label: Databases
    path: /databases/redis
---

# Redis

Use Redis for session storage, scrape deduplication, and lightweight queues in project flows.

## Install options

| Mode | When to use |
|------|-------------|
| **Docker** | Local dev or when you already run Docker on the host |
| **Native** | Linux VPS with apt — installs `redis-server` via the store driver |
| **External** | Connect to a managed Redis endpoint you operate elsewhere |

## Connection defaults

- Host: `127.0.0.1`
- Port: `6379`
- Password: generated on managed install (view in plugin credentials)

## Operations

After install, use the App Store plugin drawer to **start**, **stop**, **restart**, or view connection credentials. Health probes run a Redis `PING` when a password is set.
