from typing import Literal

from pydantic import BaseModel, Field


class DockerStatusResponse(BaseModel):
    installed: bool = False
    daemon_running: bool = False
    service_status: Literal["running", "stopped", "not_installed"] = "not_installed"
    docker_available: bool = False
    compose_available: bool = False
    hostname: str = ""
    system: str = ""
    architecture: str = ""
    kernel: str = ""
    cpu_cores: int | None = None
    memory_gb: float | None = None
    docker_version: str = ""
    compose_version: str = ""
    unix_socket: str = "unix:///var/run/docker.sock"
    config_path: str = ""
    install_dir: str = ""
    needs_install: bool = True
    can_install: bool = False


class DockerConfigResponse(BaseModel):
    registry_mirrors: list[str] = Field(default_factory=list)
    registry_mirror_display: str = ""
    compose_path: str = ""
    install_dir: str = ""
    log_max_size: str = "100m"
    log_max_file: int = 3
    ipv6: bool = False
    iptables: bool = True
    live_restore: bool = False


class DockerConfigUpdate(BaseModel):
    registry_mirror: str | None = None
    compose_path: str | None = None
    install_dir: str | None = None
    log_max_size: str | None = None
    log_max_file: int | None = Field(default=None, ge=0, le=99)
    ipv6: bool | None = None
    iptables: bool | None = None
    live_restore: bool | None = None


class DockerInstallResponse(BaseModel):
    ok: bool
    already_installed: bool = False
    messages: list[str] = Field(default_factory=list)
    status: DockerStatusResponse | None = None


class DockerServiceActionResponse(BaseModel):
    ok: bool
    action: str = ""
    message: str = ""
    status: DockerStatusResponse | None = None


class DockerContainerItem(BaseModel):
    id: str
    name: str
    image: str
    status: str = ""
    ports: str = ""
    running: bool = False
    created: str = ""


class DockerContainerListResponse(BaseModel):
    items: list[DockerContainerItem]
    total: int
    error: str | None = None


class DockerHubItem(BaseModel):
    name: str
    image: str
    description: str = ""
    stars: int = 0
    pulls: int = 0
    official: bool = False


class DockerHubListResponse(BaseModel):
    items: list[DockerHubItem]
    total: int
    query: str | None = None
    error: str | None = None


class DockerPullResponse(BaseModel):
    ok: bool
    image: str = ""
    message: str = ""


class DockerRunRequest(BaseModel):
    image: str = Field(..., min_length=1, max_length=256)
    name: str | None = Field(default=None, max_length=64)
    port: int | None = Field(default=None, ge=1, le=65535)
    host_port: int | None = Field(default=None, ge=1, le=65535)


class DockerRunResponse(BaseModel):
    ok: bool
    container_id: str = ""
    container_name: str = ""
    image: str = ""
    message: str = ""


class DockerContainerActionResponse(BaseModel):
    ok: bool
    action: str = ""
    container_id: str = ""
    message: str = ""
