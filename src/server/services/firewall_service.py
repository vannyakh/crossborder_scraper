"""Panel firewall service — UFW rules, groups, and metadata."""

from __future__ import annotations

import sys
from typing import Any

import yaml

from config import get_settings
from core.paths import firewall_config_path
from deploy.network_access import _exec_firewall
from deploy.ufw_manager import (
    add_port_rule,
    delete_rule_by_number,
    disable_ufw,
    enable_ufw,
    get_ufw_summary,
    install_ufw_package,
    parse_numbered_rules,
    rule_signature,
    set_icmp_block,
    ufw_installed,
)

_DEFAULT_CONFIG: dict[str, Any] = {
    "block_icmp": False,
    "groups": [
        {"id": "panel", "label": "Panel access", "description": "Core panel and SSH ports"},
        {
            "id": "scrape",
            "label": "Scrape stack",
            "description": "Batch workers and export services",
        },
        {"id": "database", "label": "Database", "description": "App Store database containers"},
    ],
    "rules_meta": {},
}


class FirewallService:
    def _load_config(self) -> dict[str, Any]:
        path = firewall_config_path()
        if not path.is_file():
            return dict(_DEFAULT_CONFIG)
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        if not isinstance(raw, dict):
            return dict(_DEFAULT_CONFIG)
        merged = {**_DEFAULT_CONFIG, **raw}
        if not isinstance(merged.get("groups"), list):
            merged["groups"] = list(_DEFAULT_CONFIG["groups"])
        if not isinstance(merged.get("rules_meta"), dict):
            merged["rules_meta"] = {}
        return merged

    def _save_config(self, data: dict[str, Any]) -> None:
        path = firewall_config_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")

    def _list_parsed_rules(self) -> list[dict[str, Any]]:
        proc = _exec_firewall(["ufw", "status", "numbered"])
        text = (proc.stdout or "") + (proc.stderr or "")
        return parse_numbered_rules(text)

    def get_status(self) -> dict[str, Any]:
        settings = get_settings()
        summary = get_ufw_summary(settings.panel_port)
        rules = self.list_rules()
        cfg = self._load_config()
        ip_rules = sum(
            1 for r in rules["items"] if r.get("source") not in ("0.0.0.0/0", "::/0", "any")
        )
        return {
            **summary,
            "platform": sys.platform,
            "config_path": str(firewall_config_path()),
            "block_icmp": bool(cfg.get("block_icmp")),
            "group_count": len(cfg.get("groups") or []),
            "ip_rule_count": ip_rules,
            "forward_rule_count": 0,
            "area_rule_count": 0,
        }

    def list_rules(self) -> dict[str, Any]:
        cfg = self._load_config()
        meta: dict[str, Any] = cfg.get("rules_meta") or {}
        groups = {
            g["id"]: g for g in cfg.get("groups") or [] if isinstance(g, dict) and g.get("id")
        }
        parsed = self._list_parsed_rules() if ufw_installed() else []
        items: list[dict[str, Any]] = []
        for row in parsed:
            sig = row["signature"]
            m = meta.get(sig) if isinstance(meta.get(sig), dict) else {}
            group_id = m.get("group_id")
            group = groups.get(group_id) if group_id else None
            items.append(
                {
                    **row,
                    "id": sig,
                    "remark": str(m.get("remark") or ""),
                    "group_id": group_id,
                    "group_label": group.get("label") if group else None,
                    "managed": bool(m.get("managed")),
                    "strategy": row.get("action", "allow"),
                    "status_label": "listening"
                    if row.get("listening")
                    else ("not listening" if row.get("listening") is False else "—"),
                }
            )
        return {"items": items, "total": len(items)}

    def list_groups(self) -> dict[str, Any]:
        cfg = self._load_config()
        groups = list(cfg.get("groups") or [])
        rules = self.list_rules()["items"]
        by_group: dict[str, int] = {}
        for r in rules:
            gid = r.get("group_id")
            if gid:
                by_group[gid] = by_group.get(gid, 0) + 1
        for g in groups:
            if isinstance(g, dict):
                g["rule_count"] = by_group.get(g["id"], 0)
        return {"items": groups, "total": len(groups)}

    def set_enabled(self, *, enabled: bool) -> dict[str, Any]:
        if enabled:
            ok, message = enable_ufw(default_deny=True)
        else:
            ok, message = disable_ufw()
        return {"ok": ok, "message": message, "status": self.get_status()}

    def set_block_icmp(self, *, block: bool) -> dict[str, Any]:
        ok, message = set_icmp_block(block=block)
        cfg = self._load_config()
        cfg["block_icmp"] = block
        self._save_config(cfg)
        return {"ok": ok, "message": message, "status": self.get_status()}

    async def install_ufw(self) -> dict[str, Any]:
        ok, messages = install_ufw_package()
        return {"ok": ok, "messages": messages, "status": self.get_status()}

    def create_rule(self, payload: dict[str, Any]) -> dict[str, Any]:
        protocol = str(payload.get("protocol") or "tcp").lower()
        port = str(payload.get("port") or "").strip()
        source = str(payload.get("source") or "0.0.0.0/0").strip()
        action = str(payload.get("action") or "allow").lower()
        direction = str(payload.get("direction") or "inbound").lower()
        remark = str(payload.get("remark") or "").strip()
        group_id = payload.get("group_id")

        ok, message = add_port_rule(
            protocol=protocol,
            port=port,
            source=source,
            action=action,
            direction=direction,
            remark=remark,
        )
        if not ok:
            return {"ok": False, "message": message}

        sig = rule_signature(
            protocol=protocol,
            port=port,
            source=source if source else "0.0.0.0/0",
            action=action,
            direction=direction,
        )
        cfg = self._load_config()
        meta = dict(cfg.get("rules_meta") or {})
        meta[sig] = {
            "remark": remark,
            "group_id": group_id,
            "managed": True,
            "protocol": protocol,
            "port": port,
            "source": source,
            "action": action,
            "direction": direction,
        }
        cfg["rules_meta"] = meta
        self._save_config(cfg)
        return {"ok": True, "message": message, "rules": self.list_rules()}

    def delete_rule(self, rule_id: str) -> dict[str, Any]:
        rules = self.list_rules()["items"]
        target = next(
            (r for r in rules if r.get("id") == rule_id or str(r.get("ufw_number")) == rule_id),
            None,
        )
        if not target:
            return {"ok": False, "message": "rule not found"}
        ok, message = delete_rule_by_number(int(target["ufw_number"]))
        if ok:
            cfg = self._load_config()
            meta = dict(cfg.get("rules_meta") or {})
            meta.pop(str(target.get("id")), None)
            cfg["rules_meta"] = meta
            self._save_config(cfg)
        return {"ok": ok, "message": message, "rules": self.list_rules()}

    def export_rules(self) -> dict[str, Any]:
        cfg = self._load_config()
        return {
            "version": 1,
            "block_icmp": cfg.get("block_icmp"),
            "groups": cfg.get("groups") or [],
            "rules_meta": cfg.get("rules_meta") or {},
            "live_rules": self.list_rules()["items"],
        }

    def import_rules(self, payload: dict[str, Any]) -> dict[str, Any]:
        rules = payload.get("rules") or payload.get("rules_meta") or {}
        groups = payload.get("groups")
        messages: list[str] = []
        if isinstance(groups, list):
            cfg = self._load_config()
            cfg["groups"] = groups
            self._save_config(cfg)
            messages.append(f"imported {len(groups)} groups")

        if isinstance(rules, dict):
            for sig, meta in rules.items():
                if not isinstance(meta, dict):
                    continue
                ok, msg = add_port_rule(
                    protocol=str(meta.get("protocol") or "tcp"),
                    port=str(meta.get("port") or ""),
                    source=str(meta.get("source") or "0.0.0.0/0"),
                    action=str(meta.get("action") or "allow"),
                    direction=str(meta.get("direction") or "inbound"),
                    remark=str(meta.get("remark") or ""),
                )
                messages.append(msg if ok else f"skip {sig}: {msg}")
            cfg = self._load_config()
            cfg["rules_meta"] = {**dict(cfg.get("rules_meta") or {}), **rules}
            if payload.get("block_icmp") is not None:
                cfg["block_icmp"] = bool(payload["block_icmp"])
            self._save_config(cfg)

        return {"ok": True, "messages": messages, "rules": self.list_rules()}

    def upsert_group(self, payload: dict[str, Any]) -> dict[str, Any]:
        gid = str(payload.get("id") or "").strip().lower()
        if not gid:
            raise ValueError("group id required")
        cfg = self._load_config()
        groups = [g for g in cfg.get("groups") or [] if isinstance(g, dict) and g.get("id") != gid]
        groups.append(
            {
                "id": gid,
                "label": str(payload.get("label") or gid),
                "description": str(payload.get("description") or ""),
            }
        )
        cfg["groups"] = groups
        self._save_config(cfg)
        return self.list_groups()

    def delete_group(self, group_id: str) -> dict[str, Any]:
        cfg = self._load_config()
        cfg["groups"] = [
            g for g in cfg.get("groups") or [] if isinstance(g, dict) and g.get("id") != group_id
        ]
        meta = dict(cfg.get("rules_meta") or {})
        for sig, m in list(meta.items()):
            if isinstance(m, dict) and m.get("group_id") == group_id:
                m["group_id"] = None
                meta[sig] = m
        cfg["rules_meta"] = meta
        self._save_config(cfg)
        return self.list_groups()


_service: FirewallService | None = None


def get_firewall_service() -> FirewallService:
    global _service
    if _service is None:
        _service = FirewallService()
    return _service
