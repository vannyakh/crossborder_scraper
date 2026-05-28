"""Detect official database/cache versions installable on the current host."""

from __future__ import annotations

import shutil
from typing import Any

from deploy.drivers.executor import detect_executor_platform, native_driver_supported
from deploy.drivers.registry import DriverSpec, get_driver_spec
from server.db_engines.platforms import get_probe_module, official_product_label


def probe_host_installed_version(plugin_id: str) -> str | None:
    probe = get_probe_module(plugin_id)
    if probe and hasattr(probe, "probe_host_installed_version"):
        return probe.probe_host_installed_version()
    return None


def probe_native_installable_ids(plugin_id: str, platform: str) -> list[str]:
    """Catalog version ids the host package manager likely supports."""
    spec = get_driver_spec(plugin_id)
    if not spec:
        return []
    catalog = spec.version_ids()
    if platform != "linux-debian" or not shutil.which("apt-cache"):
        return catalog

    probe = get_probe_module(plugin_id)
    if not probe or not hasattr(probe, "apt_probe_sources"):
        return catalog

    apt_versions, names = probe.apt_probe_sources()
    mapped = probe.map_apt_to_catalog(catalog, apt_versions, names)
    if mapped:
        return [v for v in catalog if v in mapped]
    return catalog


def _version_option(
    spec: DriverSpec, vid: str, *, native: bool, recommended: bool
) -> dict[str, Any]:
    resolved = spec.resolve_version(vid)
    product = official_product_label(spec.plugin_id)
    return {
        "id": vid,
        "label": f"{product} {vid}",
        "docker_image": resolved.docker_image,
        "native_supported": native,
        "recommended": recommended,
    }


def build_install_options(plugin_id: str, environment: dict[str, Any]) -> dict[str, Any]:
    from server.app_store.catalog import get_plugin

    plugin = get_plugin(plugin_id)
    if not plugin:
        raise ValueError(f"unknown plugin {plugin_id}")

    spec = get_driver_spec(plugin_id)
    platform = str(environment.get("platform") or detect_executor_platform())
    docker_ok = bool(environment.get("docker_available") and environment.get("compose_available"))
    native_ok = bool(environment.get("native_driver_available")) and native_driver_supported()

    catalog_versions = spec.version_ids() if spec else [plugin.version]
    default_version = spec.default_version if spec else plugin.version
    native_ids = probe_native_installable_ids(plugin_id, platform) if spec and native_ok else []

    docker_versions = []
    native_versions = []
    if spec:
        for vid in catalog_versions:
            is_default = vid == default_version
            if docker_ok:
                docker_versions.append(
                    _version_option(spec, vid, native=False, recommended=is_default)
                )
            if native_ok and vid in native_ids:
                native_versions.append(
                    _version_option(spec, vid, native=True, recommended=is_default)
                )

    host_version = probe_host_installed_version(plugin_id)

    return {
        "plugin_id": plugin_id,
        "product": official_product_label(plugin_id),
        "label": plugin.name,
        "description": plugin.description,
        "platform": platform,
        "default_port": plugin.default_port,
        "default_version": default_version,
        "supports_docker": plugin.supports_docker,
        "supports_native": bool(spec),
        "supports_external": plugin.supports_external,
        "docker_available": docker_ok,
        "native_available": native_ok and bool(native_versions),
        "host_detected_version": host_version,
        "docker_versions": docker_versions,
        "native_versions": native_versions,
    }
