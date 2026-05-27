# Email setup

Configure an **IMAP inbox** (and optional SMTP) for inbound agent triggers via email.

## Before you start

- Use a dedicated mailbox or alias — not your personal inbox.
- Enable **AI & LLM** in panel Settings for future agent replies.
- Prefer app passwords when your provider supports them.

## 1. Mailbox requirements

| Direction | Typical settings |
|-----------|------------------|
| **IMAP** | Host, port (993 SSL), username, password |
| **SMTP** | Host, port (587 STARTTLS), username, password — for replies |

## 2. Configure in the panel

| Field | Purpose |
|-------|---------|
| **Enable** | Mark channel active (runner coming soon) |
| **IMAP host / port** | Incoming mail server |
| **IMAP username / password** | Mailbox credentials |
| **SMTP host / port** | Outgoing server for agent replies |
| **Mailbox folder** | Usually `INBOX` |
| **Allowed senders** | Only these addresses may trigger the agent |
| **Agent prompt** | Gateway role template |

## 3. Security

- Restrict **Allowed senders** to known ops addresses.
- Store credentials in panel config — back up `config/ui_config.json` securely.
- Rotate passwords if the mailbox is shared.

## 4. When the runner is live

New messages from allowed senders will be parsed and passed to the gateway agent; replies can go out via SMTP using the same saved settings.

## Script & API

```bash
uv run crossborder gateway channels configure email \
  --json '{"imap_host":"imap.example.com","imap_username":"agent@example.com","allowed_senders":["ops@example.com"]}'
```
