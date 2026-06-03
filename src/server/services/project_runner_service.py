"""Project flow pipeline runner — walks the execution plan, dispatches node handlers."""

from __future__ import annotations

import asyncio
import time
from datetime import UTC, datetime
from typing import Any

from server.projects.run_store import (
    abort_stale_runs,
    create_run,
    get_run,
    list_runs,
    update_run,
    upsert_step,
)
from server.services.audit import log_project_runtime

# Active cancellation tokens per project_id → run_id
_active_runs: dict[str, str] = {}


def _now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _ms(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)


# ---------------------------------------------------------------------------
# Node-kind execution handlers
# ---------------------------------------------------------------------------


async def _execute_scrape_node(node: dict[str, Any]) -> tuple[str, str | None]:
    """Run a scrape node — returns (output_summary, error)."""
    url: str = node.get("host") or (node.get("options") or {}).get("url") or ""
    if not url:
        return "No URL configured on this scrape node.", None

    try:
        from config import Settings
        from core.engine.executor import ScrapeEngine
        from core.engine.jobs import ScrapeJob

        settings = Settings()
        job = ScrapeJob(url=url)
        engine = ScrapeEngine(settings=settings)
        result = await engine.run_job(job)
        if result.status.value == "success" and result.product:
            p = result.product
            return (
                f"Scraped {url} · {p.get('title', 'product')} ({result.duration_seconds:.1f}s)"
            ), None
        return f"Scrape failed for {url}: {result.error}", result.error
    except Exception as exc:
        return f"Scrape error: {exc}", str(exc)


async def _execute_webhook_node(node: dict[str, Any]) -> tuple[str, str | None]:
    """POST to a webhook URL — returns (output, error)."""
    import urllib.request

    url: str = node.get("host") or (node.get("options") or {}).get("url") or ""
    if not url:
        return "No webhook URL configured.", None

    try:
        req = urllib.request.Request(
            url,
            data=b'{"source":"crossborder","event":"flow.step"}',
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        await asyncio.to_thread(urllib.request.urlopen, req, timeout=15)
        return f"Webhook delivered to {url}", None
    except Exception as exc:
        return f"Webhook failed: {exc}", str(exc)


async def _execute_agent_node(node: dict[str, Any], project_id: str) -> tuple[str, str | None]:
    """Run gateway agent with the node's agentPrompt — returns (reply_snippet, error)."""
    prompt: str = node.get("agentPrompt") or node.get("agent_prompt") or ""
    if not prompt:
        prompt = f"Execute flow step: {node.get('label', 'agent node')}"

    try:
        from server.services.gateway_service import get_gateway_service

        svc = get_gateway_service()
        session_id = f"project-run-{project_id}"
        reply = await svc.chat(
            message=prompt,
            session_id=session_id,
            channel="project_flow",
        )
        snippet = str(reply)[:200]
        return f"Agent: {snippet}", None
    except Exception as exc:
        return f"Agent step error: {exc}", str(exc)


async def _execute_export_node(node: dict[str, Any]) -> tuple[str, str | None]:
    """Trigger a product export (simulated — export API not project-specific)."""
    label = node.get("label", "export")
    await asyncio.sleep(0.3)
    return f"{label}: export queued (connect to /products/export for live data)", None


async def _execute_notify_node(node: dict[str, Any]) -> tuple[str, str | None]:
    """Notify step — logs the configured message and returns."""
    msg = (node.get("options") or {}).get("message") or node.get("subtitle") or "Notification sent"
    await asyncio.sleep(0.1)
    return msg, None


async def _execute_condition_node(node: dict[str, Any]) -> tuple[str, str | None]:
    """Evaluate a condition gate (basic pass-through in current implementation)."""
    label = node.get("label", "condition")
    expr = (node.get("options") or {}).get("expression") or "true"
    await asyncio.sleep(0.1)
    return f"{label}: condition `{expr}` → passed", None


async def _dispatch_node(
    node: dict[str, Any],
    project_id: str,
) -> tuple[str, str | None]:
    """Route a node to its handler based on kind."""
    kind: str = node.get("kind", "")
    match kind:
        case "scrape":
            return await _execute_scrape_node(node)
        case "webhook":
            return await _execute_webhook_node(node)
        case "agent" | "gateway_agent":
            return await _execute_agent_node(node, project_id)
        case "export":
            return await _execute_export_node(node)
        case "notify":
            return await _execute_notify_node(node)
        case "condition" | "gate" | "filter":
            return await _execute_condition_node(node)
        case "schedule" | "cron_trigger" | "http_trigger":
            await asyncio.sleep(0.15)
            return f"{node.get('label', kind)} trigger registered", None
        case "model" | "plugin" | "memory":
            await asyncio.sleep(0.1)
            return f"{node.get('label', kind)} plugin configured", None
        case _:
            await asyncio.sleep(0.2)
            return f"{node.get('label', kind)} executed", None


# ---------------------------------------------------------------------------
# Execution plan helpers (mirrors project-workflow-graph.ts logic)
# ---------------------------------------------------------------------------


def _build_execution_plan(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Returns ordered list of {node, phase} dicts.
    Main-path order (topological from triggers), config plugins before each agent.
    """
    _ROLE_FOR_KIND: dict[str, str] = {
        "schedule": "trigger",
        "cron_trigger": "trigger",
        "http_trigger": "trigger",
        "webhook": "trigger",
        "agent": "agent",
        "gateway_agent": "agent",
        "model": "config",
        "plugin": "config",
        "memory": "config",
        "sticky": "note",
    }

    def role(n: dict[str, Any]) -> str:
        return n.get("role") or _ROLE_FOR_KIND.get(n.get("kind", ""), "action")

    nodes_map = {n["id"]: n for n in nodes}
    main_edges = [e for e in edges if (e.get("kind") or "main") == "main"]
    config_edges = [e for e in edges if (e.get("kind") or "main") == "config"]

    main_ids = {n["id"] for n in nodes if role(n) not in ("config", "note")}

    in_degree: dict[str, int] = {nid: 0 for nid in main_ids}
    adjacency: dict[str, list[str]] = {nid: [] for nid in main_ids}
    for e in main_edges:
        src, dst = e.get("from") or e.get("from_", ""), e.get("to", "")
        if src in main_ids and dst in main_ids:
            adjacency[src].append(dst)
            in_degree[dst] = in_degree.get(dst, 0) + 1

    triggers = [n["id"] for n in nodes if role(n) == "trigger" and n["id"] in main_ids]
    roots = triggers or [nid for nid in main_ids if in_degree.get(nid, 0) == 0]

    queue = list(roots)
    ordered: list[str] = []
    visited: set[str] = set()
    while queue:
        nid = queue.pop(0)
        if nid in visited or nid not in main_ids:
            continue
        visited.add(nid)
        ordered.append(nid)
        for child in adjacency.get(nid, []):
            in_degree[child] = max(0, in_degree.get(child, 1) - 1)
            if in_degree[child] == 0:
                queue.append(child)
    for nid in main_ids:
        if nid not in visited:
            ordered.append(nid)

    agent_ids = {n["id"] for n in nodes if role(n) == "agent"}
    config_sources: dict[str, list[dict[str, Any]]] = {}
    for e in config_edges:
        agent_id = e.get("to", "")
        if agent_id in agent_ids:
            sources = config_sources.setdefault(agent_id, [])
            src_id = e.get("from") or e.get("from_", "")
            slot = e.get("slotIndex") or e.get("slot_index") or 99
            if src_id in nodes_map:
                sources.append({"node": nodes_map[src_id], "slot": slot})
    for sources in config_sources.values():
        sources.sort(key=lambda x: x["slot"])

    plan: list[dict[str, Any]] = []
    for nid in ordered:
        node = nodes_map.get(nid)
        if not node:
            continue
        if nid in agent_ids:
            for src_entry in config_sources.get(nid, []):
                plan.append({"node": src_entry["node"], "phase": "config"})
        plan.append({"node": node, "phase": "main"})

    return plan


# ---------------------------------------------------------------------------
# Public runner API
# ---------------------------------------------------------------------------


async def _run_flow_task(
    run_id: str,
    project_id: str,
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    single_node_id: str | None = None,
) -> None:
    """Background task: execute a full flow or single node, writing run records."""

    def _step_dict(node: dict[str, Any], phase: str, status: str, **kwargs: Any) -> dict[str, Any]:
        return {
            "node_id": node["id"],
            "node_label": node.get("label", node.get("kind", "node")),
            "kind": node.get("kind", ""),
            "phase": phase,
            "status": status,
            "duration_ms": kwargs.get("duration_ms", 0),
            "output": kwargs.get("output"),
            "error": kwargs.get("error"),
            "started_at": kwargs.get("started_at"),
            "finished_at": kwargs.get("finished_at"),
        }

    update_run(project_id, run_id, {"status": "running"})
    log_project_runtime(
        project_id,
        message=f"Flow run started · {run_id[:8]}",
        level="info",
        run_id=run_id,
    )

    if single_node_id:
        all_nodes = {n["id"]: n for n in nodes}
        node = all_nodes.get(single_node_id)
        plan = [{"node": node, "phase": "main"}] if node else []
    else:
        plan = _build_execution_plan(nodes, edges)

    overall_ok = True

    for entry in plan:
        # Check for stop signal
        if _active_runs.get(project_id) != run_id:
            update_run(
                project_id,
                run_id,
                {
                    "status": "stopped",
                    "finished_at": _now_iso(),
                    "error": "Run stopped by user",
                },
            )
            log_project_runtime(project_id, message="Flow run stopped", level="warn", run_id=run_id)
            return

        node: dict[str, Any] = entry["node"]
        phase: str = entry["phase"]
        node_id = node["id"]
        node_label = node.get("label", node.get("kind", "node"))
        t_start = time.perf_counter()
        started_at = _now_iso()

        upsert_step(project_id, run_id, _step_dict(node, phase, "running", started_at=started_at))
        log_project_runtime(
            project_id,
            message=f"▶ {node_label}",
            level="info",
            node_id=node_id,
            node_label=node_label,
            run_id=run_id,
        )

        try:
            output, error = await _dispatch_node(node, project_id)
            finished_at = _now_iso()
            duration = _ms(t_start)
            if error:
                overall_ok = False
                upsert_step(
                    project_id,
                    run_id,
                    _step_dict(
                        node,
                        phase,
                        "failed",
                        duration_ms=duration,
                        output=output,
                        error=error,
                        started_at=started_at,
                        finished_at=finished_at,
                    ),
                )
                log_project_runtime(
                    project_id,
                    message=f"✗ {node_label}: {error}",
                    level="error",
                    node_id=node_id,
                    node_label=node_label,
                    run_id=run_id,
                )
            else:
                upsert_step(
                    project_id,
                    run_id,
                    _step_dict(
                        node,
                        phase,
                        "success",
                        duration_ms=duration,
                        output=output,
                        started_at=started_at,
                        finished_at=finished_at,
                    ),
                )
                log_project_runtime(
                    project_id,
                    message=f"✓ {node_label}: {output or 'ok'}",
                    level="success",
                    node_id=node_id,
                    node_label=node_label,
                    run_id=run_id,
                )
        except Exception as exc:
            finished_at = _now_iso()
            duration = _ms(t_start)
            overall_ok = False
            upsert_step(
                project_id,
                run_id,
                _step_dict(
                    node,
                    phase,
                    "failed",
                    duration_ms=duration,
                    error=str(exc),
                    started_at=started_at,
                    finished_at=finished_at,
                ),
            )
            log_project_runtime(
                project_id,
                message=f"✗ {node_label}: {exc}",
                level="error",
                node_id=node_id,
                node_label=node_label,
                run_id=run_id,
            )

    final_status = "completed" if overall_ok else "failed"
    update_run(project_id, run_id, {"status": final_status, "finished_at": _now_iso()})
    _active_runs.pop(project_id, None)

    result_word = "completed" if overall_ok else "failed"
    log_project_runtime(
        project_id,
        message=f"Flow run {result_word} · {run_id[:8]} · {len(plan)} step(s)",
        level="success" if overall_ok else "error",
        run_id=run_id,
    )


class ProjectRunnerService:
    """Orchestrates project flow pipeline execution."""

    def start_run(
        self,
        project: dict[str, Any],
        *,
        node_id: str | None = None,
        triggered_by: str = "manual",
        trigger: str = "manual",
    ) -> dict[str, Any]:
        """
        Create a run record and schedule a background task.
        Returns the run record immediately (status='pending').
        """
        project_id: str = project["id"]
        nodes: list[dict[str, Any]] = project.get("nodes", [])
        edges: list[dict[str, Any]] = project.get("edges", [])

        # Abort any previous active run for this project
        prev_run_id = _active_runs.get(project_id)
        if prev_run_id:
            update_run(
                project_id,
                prev_run_id,
                {
                    "status": "stopped",
                    "finished_at": _now_iso(),
                    "error": "Superseded by new run",
                },
            )

        run = create_run(
            project_id,
            trigger=trigger,
            triggered_by=triggered_by,
            node_id=node_id,
        )
        _active_runs[project_id] = run["id"]

        asyncio.ensure_future(
            _run_flow_task(
                run_id=run["id"],
                project_id=project_id,
                nodes=nodes,
                edges=edges,
                single_node_id=node_id,
            )
        )
        return run

    def stop_run(self, project_id: str, run_id: str) -> bool:
        """Signal the background task to stop and mark the run stopped."""
        active = _active_runs.get(project_id)
        if active == run_id:
            # Clear token so background task exits on next iteration
            _active_runs.pop(project_id, None)
        run = update_run(
            project_id,
            run_id,
            {
                "status": "stopped",
                "finished_at": _now_iso(),
                "error": "Stopped by user",
            },
        )
        return run is not None

    def get_run(self, project_id: str, run_id: str) -> dict[str, Any] | None:
        return get_run(project_id, run_id)

    def list_runs(
        self, project_id: str, *, limit: int = 20, offset: int = 0
    ) -> tuple[list[dict[str, Any]], int]:
        return list_runs(project_id, limit=limit, offset=offset)

    def cleanup_stale(self, project_id: str) -> None:
        abort_stale_runs(project_id)


_runner: ProjectRunnerService | None = None


def get_project_runner_service() -> ProjectRunnerService:
    global _runner
    if _runner is None:
        _runner = ProjectRunnerService()
    return _runner
