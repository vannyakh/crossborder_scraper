"""Service/infrastructure plugins for the panel app store (Redis, PostgreSQL, …)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

PluginCategory = Literal["database", "cache", "queue", "search"]
InstallMode = Literal["docker", "external", "source"]

StorePluginStatus = Literal[
    "not_installed",
    "installing",
    "installed",
    "running",
    "stopped",
    "error",
    "external",
    "disabled",
]


@dataclass(frozen=True)
class ConnectionField:
    key: str
    label: str
    field_type: Literal["text", "number", "password"] = "text"
    required: bool = True
    default: str | int | None = None


@dataclass(frozen=True)
class StorePluginDefinition:
    id: str
    name: str
    category: PluginCategory
    description: str
    version: str
    default_port: int
    supports_docker: bool
    supports_external: bool
    docker_image: str
    compose_service: str
    container_name: str
    connection_fields: tuple[ConnectionField, ...]
    tags: tuple[str, ...] = ()

    def to_catalog_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": "service",
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "version": self.version,
            "default_port": self.default_port,
            "supports_docker": self.supports_docker,
            "supports_external": self.supports_external,
            "docker_image": self.docker_image,
            "tags": list(self.tags),
            "connection_fields": [
                {
                    "key": f.key,
                    "label": f.label,
                    "type": f.field_type,
                    "required": f.required,
                    "default": f.default,
                }
                for f in self.connection_fields
            ],
        }


def _db_fields(default_port: int, *, with_database: bool = True) -> tuple[ConnectionField, ...]:
    fields: list[ConnectionField] = [
        ConnectionField("host", "Host", default="127.0.0.1"),
        ConnectionField("port", "Port", "number", default=default_port),
        ConnectionField("username", "Username", default="panel"),
        ConnectionField("password", "Password", "password"),
    ]
    if with_database:
        fields.append(ConnectionField("database", "Database", default="panel"))
    return tuple(fields)


PLUGINS: dict[str, StorePluginDefinition] = {
    "redis": StorePluginDefinition(
        id="redis",
        name="Redis",
        category="cache",
        description="In-memory cache and message broker for sessions, queues, and rate limits.",
        version="7",
        default_port=6379,
        supports_docker=True,
        supports_external=True,
        docker_image="redis:7-alpine",
        compose_service="redis",
        container_name="cbscraper-redis",
        connection_fields=(
            ConnectionField("host", "Host", default="127.0.0.1"),
            ConnectionField("port", "Port", "number", default=6379),
            ConnectionField("password", "Password", "password", required=False),
        ),
        tags=("cache", "queue"),
    ),
    "postgresql": StorePluginDefinition(
        id="postgresql",
        name="PostgreSQL",
        category="database",
        description="Relational database for analytics, user data, and multi-tenant workloads.",
        version="16",
        default_port=5432,
        supports_docker=True,
        supports_external=True,
        docker_image="postgres:16-alpine",
        compose_service="postgres",
        container_name="cbscraper-postgres",
        connection_fields=_db_fields(5432),
        tags=("sql", "database"),
    ),
    "mysql": StorePluginDefinition(
        id="mysql",
        name="MySQL",
        category="database",
        description="Popular SQL database compatible with MariaDB clients and ORMs.",
        version="8",
        default_port=3306,
        supports_docker=True,
        supports_external=True,
        docker_image="mysql:8",
        compose_service="mysql",
        container_name="cbscraper-mysql",
        connection_fields=_db_fields(3306),
        tags=("sql", "database"),
    ),
    "mongodb": StorePluginDefinition(
        id="mongodb",
        name="MongoDB",
        category="database",
        description=(
            "Document database for flexible product catalogs and unstructured scrape payloads."
        ),
        version="7",
        default_port=27017,
        supports_docker=True,
        supports_external=True,
        docker_image="mongo:7",
        compose_service="mongo",
        container_name="cbscraper-mongo",
        connection_fields=(
            ConnectionField("host", "Host", default="127.0.0.1"),
            ConnectionField("port", "Port", "number", default=27017),
            ConnectionField("username", "Username", default="panel"),
            ConnectionField("password", "Password", "password"),
            ConnectionField("database", "Database", default="panel"),
        ),
        tags=("nosql", "database"),
    ),
    "memcached": StorePluginDefinition(
        id="memcached",
        name="Memcached",
        category="cache",
        description="Simple distributed memory cache for hot keys and scrape deduplication.",
        version="1.6",
        default_port=11211,
        supports_docker=True,
        supports_external=True,
        docker_image="memcached:1.6-alpine",
        compose_service="memcached",
        container_name="cbscraper-memcached",
        connection_fields=(
            ConnectionField("host", "Host", default="127.0.0.1"),
            ConnectionField("port", "Port", "number", default=11211),
        ),
        tags=("cache",),
    ),
    "rabbitmq": StorePluginDefinition(
        id="rabbitmq",
        name="RabbitMQ",
        category="queue",
        description="AMQP message broker for async scrape workers and export pipelines.",
        version="3.13",
        default_port=5672,
        supports_docker=True,
        supports_external=True,
        docker_image="rabbitmq:3-management-alpine",
        compose_service="rabbitmq",
        container_name="cbscraper-rabbitmq",
        connection_fields=(
            ConnectionField("host", "Host", default="127.0.0.1"),
            ConnectionField("port", "Port", "number", default=5672),
            ConnectionField("username", "Username", default="panel"),
            ConnectionField("password", "Password", "password"),
            ConnectionField("management_port", "Management UI port", "number", default=15672),
        ),
        tags=("queue", "amqp"),
    ),
}


def get_plugin(plugin_id: str) -> StorePluginDefinition | None:
    return PLUGINS.get(plugin_id)


def list_catalog() -> list[dict[str, Any]]:
    return [p.to_catalog_dict() for p in PLUGINS.values()]


def render_compose(plugin: StorePluginDefinition, *, port: int, password: str) -> str:
    """Docker Compose v2 manifest for a single plugin."""
    if plugin.id == "redis":
        auth = f'--requirepass "{password}"' if password else ""
        return f"""services:
  redis:
    image: {plugin.docker_image}
    container_name: {plugin.container_name}
    ports:
      - "{port}:6379"
    command: redis-server {auth}
    restart: unless-stopped
"""
    if plugin.id == "postgresql":
        return f"""services:
  postgres:
    image: {plugin.docker_image}
    container_name: {plugin.container_name}
    environment:
      POSTGRES_USER: panel
      POSTGRES_PASSWORD: {password}
      POSTGRES_DB: panel
    ports:
      - "{port}:5432"
    restart: unless-stopped
"""
    if plugin.id == "mysql":
        return f"""services:
  mysql:
    image: {plugin.docker_image}
    container_name: {plugin.container_name}
    environment:
      MYSQL_ROOT_PASSWORD: {password}
      MYSQL_USER: panel
      MYSQL_PASSWORD: {password}
      MYSQL_DATABASE: panel
    ports:
      - "{port}:3306"
    restart: unless-stopped
"""
    if plugin.id == "mongodb":
        return f"""services:
  mongo:
    image: {plugin.docker_image}
    container_name: {plugin.container_name}
    environment:
      MONGO_INITDB_ROOT_USERNAME: panel
      MONGO_INITDB_ROOT_PASSWORD: {password}
      MONGO_INITDB_DATABASE: panel
    ports:
      - "{port}:27017"
    restart: unless-stopped
"""
    if plugin.id == "memcached":
        return f"""services:
  memcached:
    image: {plugin.docker_image}
    container_name: {plugin.container_name}
    ports:
      - "{port}:11211"
    restart: unless-stopped
"""
    if plugin.id == "rabbitmq":
        mgmt = port + 10000 if port < 20000 else 15672
        return f"""services:
  rabbitmq:
    image: {plugin.docker_image}
    container_name: {plugin.container_name}
    environment:
      RABBITMQ_DEFAULT_USER: panel
      RABBITMQ_DEFAULT_PASS: {password}
    ports:
      - "{port}:5672"
      - "{mgmt}:15672"
    restart: unless-stopped
"""
    raise ValueError(f"no compose template for {plugin.id}")
