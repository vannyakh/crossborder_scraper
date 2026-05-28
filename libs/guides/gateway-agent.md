# Gateway agent

Chat with **tool-using automation**: scrape, export, batch submit, and runtime checks.

## Before you start

Configure and enable the gateway agent LLM under **Settings → Agent LLM** before starting chat or cron runs.

## 1. Chat

**Agent → Chat** sends your message to the LLM with the gateway tool catalog. The agent may call tools in multiple rounds.

## 2. Skills and rules

Install SKILL.md packages under **Agent → Skills**. Rules under **Agent → Rules** adjust system behavior without code changes.

## 3. Cron schedules

**Agent → Schedules** runs prompts on a cron tick (1-minute server loop). Each run uses the same agent runtime as chat.

## 4. Pipelines

**Agent → Pipelines** are multi-step templates (scrape → export). They differ from the batch queue under **Workflow**.

## Tips

- Check **Debug → Tool catalog** to see parameters the agent can pass to each tool.
- Recent failures appear on the dashboard Health card and Support readiness checks.
