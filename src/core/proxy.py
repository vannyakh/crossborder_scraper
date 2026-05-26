import random
from itertools import cycle
from pathlib import Path
from threading import Lock
from urllib.parse import urlparse

from pydantic import BaseModel, Field


class ProxyConfig(BaseModel):
    """Playwright-compatible proxy entry."""

    server: str  # http://host:port or socks5://host:port
    username: str | None = None
    password: str | None = None

    def to_playwright(self) -> dict[str, str]:
        out: dict[str, str] = {"server": self.server}
        if self.username:
            out["username"] = self.username
        if self.password:
            out["password"] = self.password
        return out

    @classmethod
    def parse_line(cls, line: str) -> "ProxyConfig | None":
        line = line.strip()
        if not line or line.startswith("#"):
            return None
        # user:pass@host:port
        if "@" in line and "://" not in line.split("@", 1)[0]:
            creds, host = line.rsplit("@", 1)
            user, _, password = creds.partition(":")
            return cls(server=f"http://{host}", username=user or None, password=password or None)
        if "://" in line:
            parsed = urlparse(line)
            return cls(
                server=f"{parsed.scheme}://{parsed.hostname}:{parsed.port or 80}",
                username=parsed.username,
                password=parsed.password,
            )
        return cls(server=f"http://{line}")


class ProxyPool:
    """Thread-safe rotating proxy pool."""

    def __init__(self, proxies: list[ProxyConfig] | None = None):
        self._proxies = proxies or []
        self._lock = Lock()
        self._cycle = cycle(self._proxies) if self._proxies else None

    @classmethod
    def from_file(cls, path: Path) -> "ProxyPool":
        if not path.exists():
            return cls([])
        proxies: list[ProxyConfig] = []
        for line in path.read_text(encoding="utf-8").splitlines():
            cfg = ProxyConfig.parse_line(line)
            if cfg:
                proxies.append(cfg)
        return cls(proxies)

    @classmethod
    def from_settings(cls, single: str | None, list_path: Path | None) -> "ProxyPool":
        proxies: list[ProxyConfig] = []
        if list_path and list_path.exists():
            return cls.from_file(list_path)
        if single:
            cfg = ProxyConfig.parse_line(single)
            if cfg:
                proxies.append(cfg)
        return cls(proxies)

    @property
    def size(self) -> int:
        return len(self._proxies)

    def next(self) -> ProxyConfig | None:
        if not self._proxies:
            return None
        with self._lock:
            if self._cycle is None:
                return None
            return next(self._cycle)

    def random(self) -> ProxyConfig | None:
        if not self._proxies:
            return None
        return random.choice(self._proxies)

    def get(self, index: int | None = None, strategy: str = "round_robin") -> ProxyConfig | None:
        if not self._proxies:
            return None
        if strategy == "random":
            return self.random()
        if index is not None:
            return self._proxies[index % len(self._proxies)]
        return self.next()
