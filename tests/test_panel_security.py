"""Panel security entrance helpers."""

from deploy.panel_security import (
    build_login_url,
    entrance_prefix,
    generate_entry_path,
    health_path,
    normalize_entry_path,
    panel_login_path,
)


def test_normalize_entry_path() -> None:
    assert normalize_entry_path("a1b2c3d4") == "a1b2c3d4"
    assert normalize_entry_path("OFF") is None
    assert normalize_entry_path("invalid!") is None


def test_generate_entry_path_format() -> None:
    entry = generate_entry_path()
    assert len(entry) == 8
    assert normalize_entry_path(entry) == entry


def test_urls_with_entrance() -> None:
    entry = "c69e673c"
    assert entrance_prefix(entry) == "/c69e673c"
    assert panel_login_path(entry) == "/c69e673c/ui/login"
    assert health_path(entry) == "/c69e673c/health"
    url = build_login_url("43.163.97.69", 10782, entry, access_key="secret123")
    assert url.startswith("http://43.163.97.69:10782/c69e673c/ui/login?")
    assert "access_key=secret123" in url
    pub = build_login_url("43.160.245.64", 80, entry, access_key="secret123")
    assert pub == "http://43.160.245.64/c69e673c/ui/login?access_key=secret123"
