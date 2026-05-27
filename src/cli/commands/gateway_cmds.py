"""Gateway agent, workflows, skills, and prompts."""

from __future__ import annotations

import json
from typing import Any

import typer
from rich.table import Table

from cli.helpers import console, exit_gateway_error, gateway_client, run_async

skills_app = typer.Typer(help="Agent skills (OpenClaw-style SKILL.md packages)")
prompts_app = typer.Typer(help="Gateway agent role prompts")
channels_app = typer.Typer(help="Control-plane messaging channels (Telegram, …)")


def register_gateway_commands(app: typer.Typer) -> None:
    app.add_typer(skills_app, name="skills")
    app.add_typer(prompts_app, name="prompts")
    app.add_typer(channels_app, name="channels")

    @app.command("gateway")
    def gateway_status(
        url: str | None = typer.Option(None, "--url", help="Gateway base URL"),
    ) -> None:
        """Show gateway control plane status (requires running API)."""
        try:
            status = gateway_client(url).status()
        except RuntimeError as exc:
            exit_gateway_error(exc)

        settings = __import__("config", fromlist=["get_settings"]).get_settings()
        base = url or f"http://{settings.panel_host}:{settings.panel_port}"
        if settings.panel_host == "0.0.0.0":
            base = url or f"http://127.0.0.1:{settings.panel_port}"

        console.print(f"[green]{status.get('service')}[/green] v{status.get('version')}")
        console.print(f"Panel: {base}/ui/")
        console.print(
            f"Tools: {status.get('tools_count')}  "
            f"Skills: {status.get('skills_count')} ({status.get('enabled_skills_count')} enabled)  "
            f"Workflows: {status.get('workflows_count')}  "
            f"Schedules: {status.get('enabled_schedules_count')}/{status.get('schedules_count')}"
        )
        runtime = status.get("runtime") or {}
        engine = runtime.get("engine") or {}
        ai = runtime.get("ai") or {}
        console.print(
            f"Engine: max_jobs={engine.get('max_concurrent_jobs')} "
            f"running_batches={len(runtime.get('running_batches') or [])}  "
            f"AI: enabled={ai.get('ai_enabled')} model={ai.get('ai_model')}"
        )

    @app.command("agent")
    def agent_run(
        message: str = typer.Argument(..., help="Instruction for the gateway agent"),
        url: str | None = typer.Option(None, "--url", help="Gateway base URL"),
        prompt_id: str | None = typer.Option(None, "--prompt", "-p", help="Role prompt id"),
        skill: list[str] = typer.Option(
            None,
            "--skill",
            "-s",
            help="Skill id(s) to activate (repeat flag). Omit to use config/agent_skills.yaml",
        ),
        local: bool = typer.Option(False, "--local", help="Run in-process without HTTP gateway"),
    ) -> None:
        """Run the AI gateway agent (tool loop via HTTP or --local)."""
        skill_ids = list(skill) if skill else None

        if local:
            from config import get_settings
            from gateway.agent_runtime import GatewayAgent
            from server.manager import ScrapeManager

            async def _run_local() -> None:
                agent = GatewayAgent(get_settings())
                result = await agent.run(
                    message,
                    manager=ScrapeManager(),
                    prompt_id=prompt_id,
                    skill_ids=skill_ids,
                )
                console.print(result.get("message") or result)
                if result.get("skill_ids"):
                    console.print("[dim]Skills:[/dim]", ", ".join(result["skill_ids"]))
                if result.get("tool_calls"):
                    console.print("[dim]Tools used:[/dim]", len(result["tool_calls"]))

            run_async(_run_local())
            return

        try:
            result = gateway_client(url).agent_run(
                message,
                prompt_id=prompt_id,
                skill_ids=skill_ids,
            )
        except RuntimeError as exc:
            exit_gateway_error(exc)
        console.print(result.get("message") or json.dumps(result, indent=2))
        if result.get("skill_ids"):
            console.print("[dim]Skills:[/dim]", ", ".join(result["skill_ids"]))

    @app.command("workflow")
    def workflow_run(
        workflow_id: str = typer.Argument(..., help="Workflow id, e.g. scrape_to_export"),
        url: str = typer.Option("", "--url", help="Product URL (scrape_to_export)"),
        marketplace: str = typer.Option("shopify", "--marketplace", help="Target marketplace"),
        gateway_url: str | None = typer.Option(None, "--gateway", help="Gateway base URL"),
    ) -> None:
        """Run a declarative workflow pipeline."""
        inputs: dict[str, Any] = {}
        if url:
            inputs["url"] = url
        if marketplace:
            inputs["marketplace"] = marketplace
        try:
            result = gateway_client(gateway_url).run_workflow(workflow_id, inputs)
        except RuntimeError as exc:
            exit_gateway_error(exc)
        console.print(json.dumps(result, indent=2, ensure_ascii=False))

    @skills_app.command("list")
    def skills_list(
        url: str | None = typer.Option(None, "--url", help="Gateway base URL"),
        local: bool = typer.Option(False, "--local", help="Read skills from disk (no API)"),
    ) -> None:
        """List built-in and installed agent skills."""
        if local:
            from gateway.skills import get_skill_manager

            mgr = get_skill_manager()
            enabled = mgr.enabled_ids()
            table = Table(title="Agent skills (local)")
            table.add_column("ID")
            table.add_column("Name")
            table.add_column("Enabled")
            table.add_column("Tools")
            for row in mgr.list_catalog():
                name = str(row.get("name") or row["id"])
                table.add_row(
                    str(row["id"]),
                    name,
                    "yes" if row["id"] in enabled else "no",
                    ", ".join(row.get("tools") or [])[:40],
                )
            console.print(table)
            return

        try:
            data = gateway_client(url).list_skills()
        except RuntimeError as exc:
            exit_gateway_error(exc)

        enabled = set(data.get("enabled") or [])
        table = Table(title="Agent skills")
        table.add_column("ID")
        table.add_column("Kind")
        table.add_column("Enabled")
        table.add_column("Tools")
        for row in data.get("items") or []:
            table.add_row(
                str(row.get("id")),
                str(row.get("kind")),
                "yes" if row.get("id") in enabled else "no",
                ", ".join(row.get("tools") or []),
            )
        console.print(table)

    @skills_app.command("enable")
    def skills_enable(
        skill_id: list[str] = typer.Argument(..., help="Skill ids to enable"),
        url: str | None = typer.Option(None, "--url", help="Gateway base URL"),
        local: bool = typer.Option(
            False, "--local", help="Update config/agent_skills.yaml locally"
        ),
    ) -> None:
        """Enable skill ids (replaces enabled set when using API; merges when --local)."""
        if local:
            from gateway.skills import get_skill_manager

            mgr = get_skill_manager()
            current = mgr.enabled_ids() | set(skill_id)
            mgr.set_enabled(sorted(current))
            console.print("[green]Enabled:[/green]", ", ".join(sorted(current)))
            return

        try:
            client = gateway_client(url)
            current = set(client.list_skills().get("enabled") or [])
            current.update(skill_id)
            data = client.set_enabled_skills(sorted(current))
        except RuntimeError as exc:
            exit_gateway_error(exc)
        console.print("[green]Enabled skills:[/green]", ", ".join(data.get("enabled") or []))

    @prompts_app.command("list")
    def prompts_list(
        url: str | None = typer.Option(None, "--url", help="Gateway base URL"),
        local: bool = typer.Option(True, "--local/--remote", help="Read from libs/prompts or API"),
    ) -> None:
        """List gateway agent role prompts."""
        if local:
            from gateway.prompts import list_prompts

            items = list_prompts()
        else:
            try:
                data = gateway_client(url).list_prompts()
                items = data.get("items") or []
            except RuntimeError as exc:
                exit_gateway_error(exc)

        table = Table(title="Agent prompts")
        table.add_column("ID")
        table.add_column("Label")
        table.add_column("Recommended")
        for row in items:
            table.add_row(
                str(row.get("id")),
                str(row.get("label")),
                "yes" if row.get("recommended") else "",
            )
        console.print(table)

    @channels_app.command("telegram")
    def channels_telegram(
        url: str | None = typer.Option(None, "--url", help="Gateway base URL"),
        local: bool = typer.Option(False, "--local", help="Read config/ui_config.json locally"),
    ) -> None:
        """Show Telegram channel integration status."""
        if local:
            from config.telegram_store import load_telegram_config

            tg = load_telegram_config()
            console.print(
                f"enabled={tg.get('enabled')}  token_set={bool(tg.get('bot_token'))}  "
                f"chats={tg.get('control_chat_ids')}  allow_any={tg.get('allow_any_chat')}"
            )
            return
        try:
            tg = gateway_client(url).get_telegram()
        except RuntimeError as exc:
            exit_gateway_error(exc)
        console.print(json.dumps(tg, indent=2))
