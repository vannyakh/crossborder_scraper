import json
from pathlib import Path
from threading import Lock

from loguru import logger
from playwright.async_api import BrowserContext


class CookieManager:
    """Per-site cookie persistence with optional per-proxy session files."""

    def __init__(self, cookies_dir: Path):
        self.cookies_dir = cookies_dir
        self.cookies_dir.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()

    def path_for(self, site_key: str, session_id: str | None = None) -> Path:
        name = site_key if not session_id else f"{site_key}_{session_id}"
        return self.cookies_dir / f"{name}.json"

    def exists(self, site_key: str, session_id: str | None = None) -> bool:
        return self.path_for(site_key, session_id).exists()

    def load_raw(self, site_key: str, session_id: str | None = None) -> list[dict]:
        path = self.path_for(site_key, session_id)
        if not path.exists():
            return []
        with self._lock:
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except Exception as exc:
                logger.warning("Invalid cookie file {}: {}", path, exc)
                return []

    async def apply(
        self,
        context: BrowserContext,
        site_key: str,
        session_id: str | None = None,
    ) -> int:
        cookies = self.load_raw(site_key, session_id)
        if cookies:
            await context.add_cookies(cookies)
            sid = session_id or "default"
            logger.debug("Applied {} cookies for {}/{}", len(cookies), site_key, sid)
        return len(cookies)

    async def save(
        self,
        context: BrowserContext,
        site_key: str,
        session_id: str | None = None,
    ) -> Path:
        path = self.path_for(site_key, session_id)
        cookies = await context.cookies()
        with self._lock:
            path.write_text(json.dumps(cookies, indent=2), encoding="utf-8")
        logger.debug("Saved {} cookies → {}", len(cookies), path.name)
        return path

    def list_sessions(self, site_key: str) -> list[str]:
        prefix = f"{site_key}_"
        sessions: list[str] = []
        for f in self.cookies_dir.glob(f"{site_key}*.json"):
            name = f.stem
            if name == site_key:
                sessions.append("default")
            elif name.startswith(prefix):
                sessions.append(name[len(prefix) :])
        return sessions
