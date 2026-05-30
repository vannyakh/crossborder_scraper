"""Panel virtual host service — nginx site configs and metadata."""

from __future__ import annotations

import sys
from typing import Any

import yaml

from config import get_settings
from core.paths import vhost_config_path
from deploy.vhost_manager import (
    apply_certbot,
    create_reverse_proxy_site,
    get_vhost_summary,
    install_nginx_package,
    list_sites,
    nginx_reload,
    remove_site,
    set_site_enabled,
    upstream_healthy,
)

_DEFAULT_CONFIG: dict[str, Any] = {
    "sites_meta": {},
}


class VhostService:
    def _load_config(self) -> dict[str, Any]:
        path = vhost_config_path()
        if not path.is_file():
            return dict(_DEFAULT_CONFIG)
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        if not isinstance(raw, dict):
            return dict(_DEFAULT_CONFIG)
        merged = {**_DEFAULT_CONFIG, **raw}
        if not isinstance(merged.get("sites_meta"), dict):
            merged["sites_meta"] = {}
        return merged

    def _save_config(self, data: dict[str, Any]) -> None:
        path = vhost_config_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")

    def get_status(self) -> dict[str, Any]:
        panel_port = get_settings().panel_port
        summary = get_vhost_summary(panel_port=panel_port)
        return {
            **summary,
            "config_path": str(vhost_config_path()),
            "platform": sys.platform,
        }

    def list_sites(self) -> dict[str, Any]:
        cfg = self._load_config()
        meta: dict[str, Any] = cfg.get("sites_meta") or {}
        items: list[dict[str, Any]] = []
        for row in list_sites():
            site_id = str(row.get("id") or "")
            m = meta.get(site_id) if isinstance(meta.get(site_id), dict) else {}
            items.append(
                {
                    **row,
                    "remark": str(m.get("remark") or ""),
                    "purpose": m.get("purpose") or ("panel" if row.get("managed") else "other"),
                }
            )
        return {"items": items, "total": len(items)}

    async def install_nginx(self) -> dict[str, Any]:
        ok, messages = install_nginx_package()
        return {"ok": ok, "messages": messages, "status": self.get_status()}

    def create_site(self, payload: dict[str, Any]) -> dict[str, Any]:
        settings = get_settings()
        domain = str(payload.get("domain") or "").strip()
        upstream_port = int(payload.get("upstream_port") or settings.panel_port)
        ssl = bool(payload.get("ssl"))
        certbot = bool(payload.get("certbot"))
        remark = str(payload.get("remark") or "").strip()
        purpose = str(payload.get("purpose") or "panel")

        result = create_reverse_proxy_site(
            domain,
            upstream_port=upstream_port,
            certbot=certbot,
            ssl=ssl and not certbot,
        )
        if result.get("site_id"):
            cfg = self._load_config()
            meta = dict(cfg.get("sites_meta") or {})
            meta[str(result["site_id"])] = {
                "remark": remark,
                "purpose": purpose,
                "domain": domain,
                "managed": True,
            }
            cfg["sites_meta"] = meta
            self._save_config(cfg)

        return {
            "ok": bool(result.get("ok")),
            "messages": result.get("messages") or [],
            "warnings": result.get("warnings") or [],
            "login_url": result.get("login_url"),
            "sites": self.list_sites(),
            "status": self.get_status(),
        }

    def set_enabled(self, site_id: str, *, enabled: bool) -> dict[str, Any]:
        cfg = self._load_config()
        meta: dict[str, Any] = cfg.get("sites_meta") or {}
        live = list_sites()
        target = next((s for s in live if s.get("id") == site_id), None)
        if not target:
            return {"ok": False, "message": "site not found"}
        warnings: list[str] = []
        site_meta = meta.get(site_id) if isinstance(meta.get(site_id), dict) else {}
        purpose = site_meta.get("purpose") or ("panel" if target.get("managed") else "other")
        if not enabled and purpose == "panel" and target.get("enabled"):
            domain = (target.get("server_names") or [site_id])[0]
            warnings.append(
                f"Disabling panel vhost {domain} will return 502 Bad Gateway "
                "for that public URL until re-enabled or the panel port is opened directly"
            )
        ok, message = set_site_enabled(str(target["filename"]), enabled=enabled)
        if ok and enabled:
            port = target.get("upstream_port")
            if port and not upstream_healthy(int(port)):
                warnings.append(f"upstream 127.0.0.1:{port} is not healthy — nginx will return 502")
        if ok:
            reload_ok, reload_msg = nginx_reload()
            if not reload_ok:
                message = f"{message}; reload failed: {reload_msg}"
        return {
            "ok": ok,
            "message": message,
            "warnings": warnings,
            "sites": self.list_sites(),
            "status": self.get_status(),
        }

    def delete_site(self, site_id: str) -> dict[str, Any]:
        live = list_sites()
        target = next((s for s in live if s.get("id") == site_id), None)
        if not target:
            return {"ok": False, "message": "site not found"}
        ok, message = remove_site(str(target["filename"]))
        if ok:
            cfg = self._load_config()
            meta = dict(cfg.get("sites_meta") or {})
            meta.pop(site_id, None)
            cfg["sites_meta"] = meta
            self._save_config(cfg)
            reload_ok, reload_msg = nginx_reload()
            if not reload_ok:
                message = f"{message}; reload failed: {reload_msg}"
        return {
            "ok": ok,
            "message": message,
            "sites": self.list_sites(),
            "status": self.get_status(),
        }

    def reload(self) -> dict[str, Any]:
        ok, message = nginx_reload()
        return {
            "ok": ok,
            "message": message,
            "status": self.get_status(),
            "sites": self.list_sites(),
        }

    def request_certbot(self, domain: str) -> dict[str, Any]:
        result = apply_certbot(domain)
        return {
            "ok": bool(result.get("ok")),
            "messages": result.get("messages") or [],
            "warnings": result.get("warnings") or [],
            "sites": self.list_sites(),
            "status": self.get_status(),
        }


_service: VhostService | None = None


def get_vhost_service() -> VhostService:
    global _service
    if _service is None:
        _service = VhostService()
    return _service
