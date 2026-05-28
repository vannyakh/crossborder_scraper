"""Integrate channel registry."""

from gateway.integrate.registry import LIVE_RUNNER_MODULES, get_channel_spec, iter_channel_specs


def test_all_catalog_channels_have_specs() -> None:
    specs = iter_channel_specs()
    assert len(specs) == 4
    ids = {s.id for s in specs}
    assert ids == {"telegram", "discord", "slack", "email"}


def test_telegram_is_live_runner() -> None:
    spec = get_channel_spec("telegram")
    assert spec.runner == "live"
    assert spec.lifecycle_module == LIVE_RUNNER_MODULES["telegram"]
    assert "bot_token" in spec.secret_keys


def test_stored_channels_have_no_lifecycle_module() -> None:
    for channel_id in ("discord", "slack", "email"):
        spec = get_channel_spec(channel_id)
        assert spec.runner == "stored"
        assert spec.lifecycle_module is None
