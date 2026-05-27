"""Built-in infrastructure driver specs — versions, images, and systemd units."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class DriverVersion:
    id: str
    docker_image: str


@dataclass(frozen=True)
class DriverSpec:
    plugin_id: str
    systemd_unit: str
    default_version: str
    versions: tuple[DriverVersion, ...]

    def version_ids(self) -> list[str]:
        return [v.id for v in self.versions]

    def resolve_version(self, version: str | None) -> DriverVersion:
        if version:
            for item in self.versions:
                if item.id == version:
                    return item
        for item in self.versions:
            if item.id == self.default_version:
                return item
        return self.versions[0]

    def to_catalog_extra(self) -> dict[str, Any]:
        return {
            "supports_native": True,
            "available_versions": self.version_ids(),
            "default_version": self.default_version,
            "systemd_unit": self.systemd_unit,
        }


DRIVER_SPECS: dict[str, DriverSpec] = {
    "redis": DriverSpec(
        plugin_id="redis",
        systemd_unit="redis-server",
        default_version="7",
        versions=(
            DriverVersion("7", "redis:7-alpine"),
            DriverVersion("6", "redis:6-alpine"),
        ),
    ),
    "postgresql": DriverSpec(
        plugin_id="postgresql",
        systemd_unit="postgresql",
        default_version="16",
        versions=(
            DriverVersion("16", "postgres:16-alpine"),
            DriverVersion("15", "postgres:15-alpine"),
            DriverVersion("14", "postgres:14-alpine"),
        ),
    ),
    "mysql": DriverSpec(
        plugin_id="mysql",
        systemd_unit="mysql",
        default_version="8",
        versions=(
            DriverVersion("8", "mysql:8"),
            DriverVersion("5.7", "mysql:5.7"),
        ),
    ),
    "mongodb": DriverSpec(
        plugin_id="mongodb",
        systemd_unit="mongod",
        default_version="7",
        versions=(
            DriverVersion("7", "mongo:7"),
            DriverVersion("6", "mongo:6"),
        ),
    ),
    "memcached": DriverSpec(
        plugin_id="memcached",
        systemd_unit="memcached",
        default_version="1.6",
        versions=(DriverVersion("1.6", "memcached:1.6-alpine"),),
    ),
    "rabbitmq": DriverSpec(
        plugin_id="rabbitmq",
        systemd_unit="rabbitmq-server",
        default_version="3.13",
        versions=(
            DriverVersion("3.13", "rabbitmq:3.13-management-alpine"),
            DriverVersion("3.12", "rabbitmq:3.12-management-alpine"),
        ),
    ),
}


def get_driver_spec(plugin_id: str) -> DriverSpec | None:
    return DRIVER_SPECS.get(plugin_id)


def docker_image_for(plugin_id: str, version: str | None) -> str | None:
    spec = get_driver_spec(plugin_id)
    if not spec:
        return None
    return spec.resolve_version(version).docker_image
