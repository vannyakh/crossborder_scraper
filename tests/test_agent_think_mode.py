"""Gateway agent think mode."""

from gateway.agent_runtime import _THINK_MODE_APPEND, GatewayAgent


def test_think_mode_appends_instruction() -> None:
    prompt = "Base system prompt."
    think_prompt = f"{prompt.strip()}{_THINK_MODE_APPEND}"
    assert "## Think mode" in think_prompt
    assert "step-by-step" in think_prompt.lower()


def test_run_accepts_think_kwarg() -> None:
    import inspect

    sig = inspect.signature(GatewayAgent.run)
    assert "think" in sig.parameters
