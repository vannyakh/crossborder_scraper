"""Extended gateway agent CLI — chat, rules, discovery, schedule patch."""

from __future__ import annotations

import json
from typing import Any

import typer
from rich.table import Table

from cli.helpers import console, exit_gateway_error, gateway_client, run_async

chat_app = typer.Typer(help="Multi-turn agent chat (panel sessions)")
rules_app = typer.Typer(help="Gateway agent behavior rules")
runs_app = typer.Typer(help="Agent run history (cron + chat)")
discover_app = typer.Typer(help="Gateway tools and workflow catalog")


def register_agent_cli_commands(app: typer.Typer) -> None:
    app.add_typer(chat_app, name="chat")
    app.add_typer(rules_app, name="rules")
    app.add_typer(runs_app, name="runs")
    app.add_typer(discover_app, name="discover")

    _register_chat_commands()
    _register_rules_commands()
    _register_runs_commands()
    _register_discover_commands()


def _register_discover_commands() -> None:
    @discover_app.command("tools")
    def discover_tools(
        url: str | None = typer.Option(None, "--url", help="Gateway base URL"),
    ) -> None:
        """List gateway agent tools and descriptions."""
        try:
            data = gateway_client(url).list_tools()
        except RuntimeError as exc:
            exit_gateway_error(exc)
        table = Table(title="Gateway tools")
        table.add_column("Name")
        table.add_column("Description")
        for row in data.get("items") or []:
            desc = str(row.get("description") or "")[:72]
            table.add_row(str(row.get("name")), desc)
        console.print(table)

    @discover_app.command("workflows")
    def discover_workflows(
        url: str | None = typer.Option(None, "--url", help="Gateway base URL"),
    ) -> None:
        """List declarative agent workflows."""
        try:
            data = gateway_client(url).list_workflows()
        except RuntimeError as exc:
            exit_gateway_error(exc)
        table = Table(title="Workflows")
        table.add_column("ID")
        table.add_column("Label")
        table.add_column("Description")
        for row in data.get("items") or []:
            table.add_row(
                str(row.get("id")),
                str(row.get("label") or ""),
                str(row.get("description") or "")[:60],
            )
        console.print(table)


def _register_runs_commands() -> None:
    @runs_app.command("list")
    def runs_list(
        url: str | None = typer.Option(None, "--url", help="Gateway base URL"),
        limit: int = typer.Option(30, "--limit", "-n", help="Max rows"),
    ) -> None:
        """List recent agent runs (schedules and chat)."""
        try:
            data = gateway_client(url).list_runs(limit=limit)
        except RuntimeError as exc:
            exit_gateway_error(exc)
        table = Table(title="Agent runs")
        table.add_column("When")
        table.add_column("Trigger")
        table.add_column("OK")
        table.add_column("Summary")
        for row in data.get("items") or []:
            summary = str(row.get("response") or row.get("error") or "")[:50]
            table.add_row(
                str(row.get("started_at") or "")[:19],
                str(row.get("trigger") or row.get("schedule_name") or ""),
                "yes" if row.get("ok") else "no" if row.get("ok") is False else "",
                summary,
            )
        console.print(table)


def _register_rules_commands() -> None:
    @rules_app.command("list")
    def rules_list(
        url: str | None = typer.Option(None, "--url", help="Gateway base URL"),
        local: bool = typer.Option(False, "--local", help="Read libs/agent_rules locally"),
    ) -> None:
        """List gateway agent rules and enabled state."""
        if local:
            from gateway.rules import get_rule_manager

            mgr = get_rule_manager()
            enabled = mgr.enabled_ids()
            table = Table(title="Agent rules (local)")
            table.add_column("ID")
            table.add_column("Name")
            table.add_column("Enabled")
            table.add_column("Category")
            for row in mgr.list_catalog():
                table.add_row(
                    str(row.get("id")),
                    str(row.get("name") or ""),
                    "yes" if row.get("id") in enabled else "no",
                    str(row.get("category") or ""),
                )
            console.print(table)
            return
        try:
            data = gateway_client(url).list_rules()
        except RuntimeError as exc:
            exit_gateway_error(exc)
        enabled = set(data.get("enabled") or [])
        table = Table(title="Agent rules")
        table.add_column("ID")
        table.add_column("Name")
        table.add_column("Enabled")
        table.add_column("Category")
        for row in data.get("items") or []:
            table.add_row(
                str(row.get("id")),
                str(row.get("name") or ""),
                "yes" if row.get("id") in enabled else "no",
                str(row.get("category") or ""),
            )
        console.print(table)

    @rules_app.command("enable")
    def rules_enable(
        rule_id: list[str] = typer.Argument(..., help="Rule ids to enable"),
        url: str | None = typer.Option(None, "--url"),
        local: bool = typer.Option(False, "--local"),
    ) -> None:
        """Enable agent rules (merge into current set)."""
        if local:
            from gateway.rules import get_rule_manager

            mgr = get_rule_manager()
            current = mgr.enabled_ids() | set(rule_id)
            mgr.set_enabled(sorted(current))
            console.print("[green]Enabled:[/green]", ", ".join(sorted(current)))
            return
        try:
            client = gateway_client(url)
            current = set(client.list_rules().get("enabled") or [])
            current.update(rule_id)
            data = client.set_enabled_rules(sorted(current))
        except RuntimeError as exc:
            exit_gateway_error(exc)
        console.print("[green]Enabled rules:[/green]", ", ".join(data.get("enabled") or []))

    @rules_app.command("disable")
    def rules_disable(
        rule_id: list[str] = typer.Argument(..., help="Rule ids to disable"),
        url: str | None = typer.Option(None, "--url"),
        local: bool = typer.Option(False, "--local"),
    ) -> None:
        """Disable agent rules."""
        if local:
            from gateway.rules import get_rule_manager

            mgr = get_rule_manager()
            current = mgr.enabled_ids() - set(rule_id)
            mgr.set_enabled(sorted(current))
            console.print("[green]Enabled:[/green]", ", ".join(sorted(current)))
            return
        try:
            client = gateway_client(url)
            current = set(client.list_rules().get("enabled") or [])
            current -= set(rule_id)
            data = client.set_enabled_rules(sorted(current))
        except RuntimeError as exc:
            exit_gateway_error(exc)
        console.print("[green]Enabled rules:[/green]", ", ".join(data.get("enabled") or []))

    @rules_app.command("set")
    def rules_set(
        rule_id: list[str] = typer.Argument(..., help="Complete enabled rule id list"),
        url: str | None = typer.Option(None, "--url"),
        local: bool = typer.Option(False, "--local"),
    ) -> None:
        """Replace the enabled agent rules set."""
        if local:
            from gateway.rules import get_rule_manager

            mgr = get_rule_manager()
            enabled = mgr.set_enabled(list(rule_id))
            console.print("[green]Enabled:[/green]", ", ".join(enabled))
            return
        try:
            data = gateway_client(url).set_enabled_rules(list(rule_id))
        except RuntimeError as exc:
            exit_gateway_error(exc)
        console.print("[green]Enabled rules:[/green]", ", ".join(data.get("enabled") or []))

    @rules_app.command("show")
    def rules_show(
        rule_id: str = typer.Argument(..., help="Rule id"),
        url: str | None = typer.Option(None, "--url"),
        local: bool = typer.Option(False, "--local"),
    ) -> None:
        """Show rule body and metadata."""
        if local:
            from gateway.rules import get_rule_manager

            manifest = get_rule_manager().get_manifest(rule_id)
            if not manifest:
                console.print("[red]Rule not found[/red]")
                raise typer.Exit(1)
            console.print(manifest.body)
            return
        try:
            data = gateway_client(url).get_rule(rule_id)
        except RuntimeError as exc:
            exit_gateway_error(exc)
        console.print(data.get("body") or json.dumps(data, indent=2))


def _interactive_chat(
    *,
    url: str | None,
    session_id: str | None,
    prompt_id: str | None,
    skill: list[str] | None,
    local: bool,
) -> None:
    sid = session_id
    skill_ids = list(skill) if skill else None
    console.print("[dim]Agent chat — type exit or Ctrl+C to quit[/dim]")
    if sid:
        console.print(f"[dim]Session: {sid}[/dim]")

    while True:
        try:
            message = console.input("[bold cyan]You>[/bold cyan] ").strip()
        except (EOFError, KeyboardInterrupt):
            console.print()
            break
        if not message:
            continue
        if message.lower() in {"exit", "quit", "/exit", "/quit"}:
            break

        if local:
            if session_id:
                console.print(
                    "[yellow]--session with --local is limited; "
                    "omit --local or use HTTP API[/yellow]"
                )
            from config import get_settings
            from gateway.agent_runtime import GatewayAgent
            from server.manager import ScrapeManager

            async def _run() -> dict[str, Any]:
                agent = GatewayAgent(get_settings())
                return await agent.run(
                    message,
                    manager=ScrapeManager(),
                    prompt_id=prompt_id,
                    skill_ids=skill_ids,
                )

            result = run_async(_run())
        else:
            try:
                result = gateway_client(url).agent_run(
                    message,
                    prompt_id=prompt_id,
                    session_id=sid,
                    skill_ids=skill_ids,
                )
            except RuntimeError as exc:
                exit_gateway_error(exc)

        sid = result.get("session_id") or sid
        console.print(f"[bold green]Agent>[/bold green] {result.get('message') or result}")
        if result.get("tool_calls"):
            console.print(f"[dim]({len(result['tool_calls'])} tool call(s))[/dim]")


def _register_chat_commands() -> None:
    sessions_app = typer.Typer(help="Panel chat sessions")
    chat_app.add_typer(sessions_app, name="sessions")

    @chat_app.callback(invoke_without_command=True)
    def chat_entry(
        ctx: typer.Context,
        url: str | None = typer.Option(None, "--url", help="Gateway base URL"),
        session: str | None = typer.Option(None, "--session", "-s", help="Existing session id"),
        prompt_id: str | None = typer.Option(None, "--prompt", "-p", help="Role prompt id"),
        skill: list[str] = typer.Option(
            None,
            "--skill",
            help="Skill id(s) to activate (repeat flag)",
        ),
        local: bool = typer.Option(False, "--local", help="Run in-process without HTTP"),
    ) -> None:
        """Interactive multi-turn agent chat."""
        if ctx.invoked_subcommand is not None:
            return
        _interactive_chat(
            url=url,
            session_id=session,
            prompt_id=prompt_id,
            skill=skill,
            local=local,
        )

    @sessions_app.command("list")
    def chat_sessions_list(
        url: str | None = typer.Option(None, "--url"),
        channel: str | None = typer.Option(None, "--channel", help="Filter by channel_id"),
    ) -> None:
        """List agent chat sessions."""
        try:
            data = gateway_client(url).list_chat_sessions(channel_id=channel)
        except RuntimeError as exc:
            exit_gateway_error(exc)
        table = Table(title="Chat sessions")
        table.add_column("ID")
        table.add_column("Label")
        table.add_column("Channel")
        table.add_column("Messages")
        table.add_column("Updated")
        for row in data.get("items") or []:
            table.add_row(
                str(row.get("id") or "")[:12],
                str(row.get("display_label") or row.get("label") or ""),
                str(row.get("channel_id") or ""),
                str(row.get("message_count") or 0),
                str(row.get("updated_at") or "")[:19],
            )
        console.print(table)

    @sessions_app.command("create")
    def chat_sessions_create(
        label: str | None = typer.Option(None, "--label", "-l", help="Session label"),
        prompt_id: str | None = typer.Option(None, "--prompt", "-p"),
        url: str | None = typer.Option(None, "--url"),
    ) -> None:
        """Create a new chat session."""
        try:
            data = gateway_client(url).create_chat_session(label=label, prompt_id=prompt_id)
        except RuntimeError as exc:
            exit_gateway_error(exc)
        console.print(json.dumps(data, indent=2))

    @sessions_app.command("show")
    def chat_sessions_show(
        session_id: str = typer.Argument(..., help="Session id"),
        url: str | None = typer.Option(None, "--url"),
    ) -> None:
        """Show session detail and message history."""
        try:
            data = gateway_client(url).get_chat_session(session_id)
        except RuntimeError as exc:
            exit_gateway_error(exc)
        console.print(json.dumps(data, indent=2, ensure_ascii=False))

    @sessions_app.command("delete")
    def chat_sessions_delete(
        session_id: str = typer.Argument(..., help="Session id"),
        url: str | None = typer.Option(None, "--url"),
    ) -> None:
        """Delete a chat session."""
        try:
            gateway_client(url).delete_chat_session(session_id)
        except RuntimeError as exc:
            exit_gateway_error(exc)
        console.print("[green]Deleted[/green]", session_id)
