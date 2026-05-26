import json
import os
from pathlib import Path
from typing import Any

from config.marketplaces import (
    default_marketplaces,
    flatten_marketplace_credentials,
    marketplaces_from_settings,
    mask_marketplaces,
    normalize_marketplaces,
)

UI_CONFIG_DIR = Path("config")
UI_CONFIG_PATH = UI_CONFIG_DIR / "ui_config.json"
UI_CONFIG_EXAMPLE_PATH = UI_CONFIG_DIR / "ui_config.example.json"
LEGACY_RUNTIME_PATH = Path("data/runtime_config.json")

AI_UI_KEYS = frozenset(
    {
        "ai_enabled",
        "ai_fallback",
        "ai_agent_enabled",
        "ai_model",
        "ai_max_html_chars",
        "ai_timeout_seconds",
    }
)

PANEL_SCALAR_KEYS = AI_UI_KEYS | frozenset(
    {
        "price_markup_percent",
        "default_currency",
        "scrape_default_workers",
        "headless",
        "browser_timeout_ms",
        "request_delay_seconds",
        "proxy_list_path",
        "proxy_rotation_strategy",
        "max_concurrent_jobs",
        "proxy_server",
        "ai_api_key",
        "ai_base_url",
    }
)

# Backward-compatible alias
UI_EDITABLE_KEYS = PANEL_SCALAR_KEYS

# Legacy .env names — migrate to config/ui_config.json
ENV_UI_VAR_NAMES = frozenset(
    {
        "AI_ENABLED",
        "AI_FALLBACK",
        "AI_AGENT_ENABLED",
        "AI_MODEL",
        "AI_MAX_HTML_CHARS",
        "AI_TIMEOUT_SECONDS",
        "PRICE_MARKUP_PERCENT",
        "DEFAULT_CURRENCY",
        "SCRAPE_DEFAULT_WORKERS",
        "HEADLESS",
        "BROWSER_TIMEOUT_MS",
        "REQUEST_DELAY_SECONDS",
        "PROXY_LIST_PATH",
        "PROXY_ROTATION_STRATEGY",
        "PROXY_SERVER",
        "MAX_CONCURRENT_JOBS",
        "AI_API_KEY",
        "AI_BASE_URL",
        "SHOPEE_PARTNER_ID",
        "SHOPEE_PARTNER_KEY",
        "SHOPEE_SHOP_ID",
        "SHOPEE_ACCESS_TOKEN",
        "LAZADA_APP_KEY",
        "LAZADA_APP_SECRET",
        "LAZADA_ACCESS_TOKEN",
        "TIKTOK_APP_KEY",
        "TIKTOK_APP_SECRET",
        "TIKTOK_ACCESS_TOKEN",
        "TIKTOK_SHOP_CIPHER",
        "SHOPIFY_SHOP_DOMAIN",
        "SHOPIFY_ACCESS_TOKEN",
        "SHOPIFY_API_VERSION",
    }
)

# Only panel login stays in .env on the server
ENV_LOCKED_KEYS = frozenset(
    {
        "panel_auth_enabled",
        "panel_username",
        "panel_password",
        "data_dir",
        "cookies_dir",
        "output_dir",
        "db_path",
        "slow_mo_ms",
        "user_agent",
        "engine_queue_size",
        "max_images_per_product",
    }
)


def ensure_ui_config_file() -> Path:
    UI_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    if not UI_CONFIG_PATH.exists():
        if UI_CONFIG_EXAMPLE_PATH.exists():
            UI_CONFIG_PATH.write_text(
                UI_CONFIG_EXAMPLE_PATH.read_text(encoding="utf-8"),
                encoding="utf-8",
            )
        else:
            UI_CONFIG_PATH.write_text(json.dumps(_default_panel_raw(), indent=2) + "\n", encoding="utf-8")
    _secure_file(UI_CONFIG_PATH)
    return UI_CONFIG_PATH


def _default_panel_raw() -> dict[str, Any]:
    return {
        "ai_enabled": False,
        "ai_fallback": True,
        "ai_agent_enabled": False,
        "ai_model": "gpt-4o-mini",
        "ai_max_html_chars": 24000,
        "ai_timeout_seconds": 90,
        "ai_api_key": "",
        "ai_base_url": "https://api.openai.com/v1",
        "headless": True,
        "browser_timeout_ms": 60000,
        "request_delay_seconds": 2,
        "max_concurrent_jobs": 3,
        "scrape_default_workers": 3,
        "proxy_list_path": "config/proxies.txt",
        "proxy_rotation_strategy": "round_robin",
        "proxy_server": "",
        "price_markup_percent": 35,
        "default_currency": "USD",
        "marketplaces": default_marketplaces(),
    }


def _secure_file(path: Path) -> None:
    try:
        path.chmod(0o600)
    except OSError:
        pass
    try:
        os.chmod(UI_CONFIG_DIR, 0o700)
    except OSError:
        pass


def mask_api_key(key: str | None) -> str | None:
    if not key:
        return None
    if len(key) <= 8:
        return "***"
    return f"{key[:4]}…{key[-4:]}"


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    return data if isinstance(data, dict) else {}


def load_panel_raw() -> dict[str, Any]:
    ensure_ui_config_file()
    raw = _read_json(UI_CONFIG_PATH)
    raw.pop("_doc", None)
    if not raw:
        return _default_panel_raw()
    if "marketplaces" not in raw:
        raw["marketplaces"] = default_marketplaces()
    else:
        raw["marketplaces"] = normalize_marketplaces(raw["marketplaces"])
    return raw


def load_ui_config() -> dict[str, Any]:
    raw = load_panel_raw()
    return {k: v for k, v in raw.items() if k in PANEL_SCALAR_KEYS}


def load_marketplaces_config() -> dict[str, Any]:
    return normalize_marketplaces(load_panel_raw().get("marketplaces"))


def _migrate_legacy_runtime() -> dict[str, Any]:
    legacy = _read_json(LEGACY_RUNTIME_PATH)
    if not legacy:
        return {}
    cleaned = {k: v for k, v in legacy.items() if k in PANEL_SCALAR_KEYS}
    if cleaned:
        raw = load_panel_raw()
        raw.update(cleaned)
        _write_panel_raw(raw)
    return cleaned


def _seed_from_env() -> dict[str, Any]:
    from config.settings import Settings

    s = Settings()
    raw = _default_panel_raw()
    for key in PANEL_SCALAR_KEYS:
        if hasattr(s, key):
            val = getattr(s, key)
            if val is not None and val != "":
                raw[key] = val if not isinstance(val, Path) else str(val)
    raw["marketplaces"] = marketplaces_from_settings(s)
    _write_panel_raw(raw)
    return {k: v for k, v in raw.items() if k in PANEL_SCALAR_KEYS}


def _write_panel_raw(raw: dict[str, Any]) -> None:
    ensure_ui_config_file()
    out = dict(raw)
    out.pop("_doc", None)
    if "marketplaces" in out:
        out["marketplaces"] = normalize_marketplaces(out["marketplaces"])
    UI_CONFIG_PATH.write_text(json.dumps(out, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    _secure_file(UI_CONFIG_PATH)


def _sync_env_into_panel_once() -> None:
    """One-time: pull legacy .env values into ui_config.json when panel fields are empty."""
    from config.settings import Settings

    env_settings = Settings()
    raw = load_panel_raw()
    changed = False
    for key in PANEL_SCALAR_KEYS:
        current = raw.get(key)
        env_val = getattr(env_settings, key, None)
        if (current is None or current == "") and env_val not in (None, ""):
            raw[key] = str(env_val) if isinstance(env_val, Path) else env_val
            changed = True
    mp = normalize_marketplaces(raw.get("marketplaces"))
    for platform_id, entry in marketplaces_from_settings(env_settings).items():
        if not entry.get("enabled"):
            continue
        if not mp.get(platform_id, {}).get("enabled"):
            mp[platform_id] = entry
            changed = True
    if changed:
        raw["marketplaces"] = mp
        _write_panel_raw(raw)


def _ensure_seeded() -> None:
    raw = _read_json(UI_CONFIG_PATH)
    if not raw:
        _seed_from_env()
    else:
        _sync_env_into_panel_once()


def save_ui_config(updates: dict[str, Any]) -> dict[str, Any]:
    return save_panel_config(scalar_updates=updates)


def save_panel_config(
    *,
    scalar_updates: dict[str, Any] | None = None,
    marketplace_updates: dict[str, Any] | None = None,
) -> dict[str, Any]:
    raw = load_panel_raw()
    if scalar_updates:
        for key, value in scalar_updates.items():
            if key not in PANEL_SCALAR_KEYS:
                continue
            if value is None or value == "":
                if key in ("ai_api_key", "proxy_server"):
                    raw[key] = ""
                else:
                    raw.pop(key, None)
            else:
                raw[key] = value
    if marketplace_updates:
        mp = normalize_marketplaces(raw.get("marketplaces"))
        for platform_id, entry in marketplace_updates.items():
            if not isinstance(entry, dict):
                continue
            current = mp.get(
                platform_id,
                {"label": platform_id, "enabled": False, "credentials": {}},
            )
            if "label" in entry and entry["label"] is not None:
                current["label"] = entry["label"]
            if "enabled" in entry and entry["enabled"] is not None:
                current["enabled"] = bool(entry["enabled"])
            creds_in = entry.get("credentials")
            if isinstance(creds_in, dict):
                current.setdefault("credentials", {})
                for ck, cv in creds_in.items():
                    if cv is None:
                        continue
                    if cv == "":
                        current["credentials"].pop(ck, None)
                    elif "…" in str(cv):
                        continue
                    else:
                        current["credentials"][ck] = cv
            mp[platform_id] = current
        raw["marketplaces"] = mp
    _write_panel_raw(raw)
    return load_ui_config()


def apply_ui_config(settings: Any) -> Any:
    _ensure_seeded()
    scalars = load_ui_config()
    mp = load_marketplaces_config()
    flat_mp = flatten_marketplace_credentials(mp)
    fields = getattr(settings.__class__, "model_fields", {})
    valid = {k: v for k, v in {**scalars, **flat_mp}.items() if k in fields}
    if not valid:
        merged = settings
    else:
        merged = settings.model_copy(update=valid)
    locked = {key: getattr(settings, key) for key in ENV_LOCKED_KEYS if hasattr(settings, key)}
    return merged.model_copy(update=locked)


def panel_config_for_api(*, mask_secrets: bool = True) -> dict[str, Any]:
    _ensure_seeded()
    raw = load_panel_raw()
    scalars = {k: v for k, v in raw.items() if k in PANEL_SCALAR_KEYS}
    if scalars.get("proxy_list_path"):
        scalars["proxy_list_path"] = str(scalars["proxy_list_path"])
    workers = scalars.get("scrape_default_workers") or scalars.get("max_concurrent_jobs") or 3
    scalars["scrape_default_workers"] = workers
    marketplaces = load_marketplaces_config()
    if mask_secrets:
        if scalars.get("ai_api_key"):
            scalars["ai_api_key_masked"] = mask_api_key(str(scalars["ai_api_key"]))
        scalars.pop("ai_api_key", None)
        if scalars.get("proxy_server"):
            scalars["proxy_server_masked"] = mask_api_key(str(scalars["proxy_server"]))
        scalars.pop("proxy_server", None)
        marketplaces = mask_marketplaces(marketplaces, mask_api_key)
    return {
        **scalars,
        "marketplaces": marketplaces,
        "ui_config_path": str(UI_CONFIG_PATH),
        "config_dir": str(UI_CONFIG_PATH.parent),
        "secrets_from_panel_config": True,
    }
