# Agent skills

Each skill is a folder with `SKILL.md`:

- YAML frontmatter (`name`, `description`, `metadata.crossborder.tools`)
- Markdown instructions appended to the gateway agent system prompt

Built-in skills ship here. Custom skills install to `installed_skills/` via `POST /gateway/skills/install`.

Enable/disable in `config/agent_skills.yaml` or the Agent UI **Skills** panel.
