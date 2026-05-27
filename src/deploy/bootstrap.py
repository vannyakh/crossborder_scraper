"""Server bootstrap — directories, config templates, credentials, Playwright."""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from core.paths import (
    agent_skills_config_path,
    config_dir,
    data_dir,
    env_file_path,
    installed_plugins_dir,
    installed_skills_dir,
    repo_root,
)
from deploy.platform import PlatformInfo, detect_platform, python_executable


@dataclass
class ServerBootstrap:
    root: Path
    platform: PlatformInfo
    steps_done: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def ensure_directories(self) -> None:
        for path in (
            data_dir() if self.root == repo_root() else self.root / "data",
            (self.root / "data" / "cookies"),
            (self.root / "data" / "output"),
            config_dir() if self.root == repo_root() else self.root / "config",
            installed_plugins_dir() if self.root == repo_root() else self.root / "installed_plugins",
            installed_skills_dir() if self.root == repo_root() else self.root / "installed_skills",
        ):
            path.mkdir(parents=True, exist_ok=True)
        self.steps_done.append("directories")

    def seed_config_files(self) -> None:
        cfg = config_dir() if self.root == repo_root() else self.root / "config"
        seeds: list[tuple[str, str]] = [
            ("ui_config.example.json", "ui_config.json"),
            ("agent_schedules.example.json", "agent_schedules.json"),
            ("agent_skills.example.yaml", "agent_skills.yaml"),
            ("plugins.yaml", "plugins.yaml"),
            ("sites.yaml", "sites.yaml"),
            ("proxies.txt", "proxies.txt"),
        ]
        for src_name, dest_name in seeds:
            src = cfg / src_name if (cfg / src_name).exists() else repo_root() / "config" / src_name
            dest = cfg / dest_name
            if dest.exists():
                continue
            if src_name == "plugins.yaml" and not src.exists():
                dest.write_text("source_plugins: {}\nsecurity: {}\n", encoding="utf-8")
                continue
            if src.exists():
                shutil.copy2(src, dest)
        self.steps_done.append("config")

    def ensure_env(
        self,
        *,
        regenerate: bool = False,
        bind_host: str | None = None,
        port: int | None = None,
        auto_port: bool = True,
        external_host: str | None = None,
    ) -> object:
        from config.credentials import ensure_panel_credentials
        from deploy.network import build_panel_access_info
        from deploy.panel_access import configure_panel_bind

        env_path = self.root / ".env" if self.root != repo_root() else env_file_path()
        example = repo_root() / ".env.example"
        if not env_path.exists() and example.exists():
            shutil.copy2(example, env_path)

        host, chosen_port, port_adjusted = configure_panel_bind(
            host=bind_host,
            port=port,
            auto_port=auto_port,
            env_path=env_path,
        )
        username, password, generated = ensure_panel_credentials(
            env_path,
            force_regenerate=regenerate,
        )
        self.steps_done.append("env")

        access = build_panel_access_info(
            username=username,
            password=password,
            bind_host=host,
            port=chosen_port,
            credentials_generated=generated,
            env_path=str(env_path),
            port_auto_adjusted=port_adjusted,
            external_host=external_host,
        )
        return access

    def install_python_deps(self, *, dev: bool = False) -> None:
        if self.platform.has_uv and (repo_root() / "pyproject.toml").exists():
            subprocess.run(["uv", "sync"], cwd=repo_root(), check=True)
        else:
            subprocess.run(
                [python_executable(), "-m", "pip", "install", "-e", str(repo_root())],
                check=True,
            )
        self.steps_done.append("python_deps")

    def install_playwright(self, *, with_deps: bool = False) -> None:
        args = [python_executable(), "-m", "playwright", "install", "chromium"]
        if with_deps and self.platform.is_linux:
            args = [python_executable(), "-m", "playwright", "install", "--with-deps", "chromium"]
        try:
            subprocess.run(args, cwd=repo_root(), check=True)
            self.steps_done.append("playwright")
        except subprocess.CalledProcessError as exc:
            self.warnings.append(f"Playwright install failed: {exc}")

    def write_compose_override(self) -> Path:
        """Write deploy/docker-compose.override.yml pointer env for production."""
        deploy_dir = repo_root() / "deploy"
        deploy_dir.mkdir(parents=True, exist_ok=True)
        env_deploy = deploy_dir / ".env.deploy.example"
        if not env_deploy.exists():
            env_deploy.write_text(
                "# Copy to repo root as .env for Docker Compose\n"
                "PANEL_HOST=0.0.0.0\n"
                "PANEL_PORT=8000\n"
                "HEADLESS=true\n"
                "MAX_CONCURRENT_JOBS=3\n",
                encoding="utf-8",
            )
        self.steps_done.append("deploy_env_example")
        return env_deploy


def bootstrap_server(
    *,
    server: bool = True,
    regenerate_credentials: bool = False,
    install_deps: bool = True,
    install_browser: bool = True,
    playwright_system_deps: bool = False,
    bind_host: str | None = None,
    port: int | None = None,
    auto_port: bool = True,
    external_host: str | None = None,
) -> tuple[ServerBootstrap, object]:
    root = repo_root()
    plat = detect_platform()
    boot = ServerBootstrap(root=root, platform=plat)

    boot.ensure_directories()
    boot.seed_config_files()
    access = boot.ensure_env(
        regenerate=regenerate_credentials,
        bind_host=bind_host,
        port=port,
        auto_port=auto_port,
        external_host=external_host,
    )

    if install_deps:
        try:
            boot.install_python_deps(dev=not server)
        except subprocess.CalledProcessError as exc:
            boot.warnings.append(f"Python deps: {exc}")

    if install_browser:
        boot.install_playwright(with_deps=playwright_system_deps and plat.is_linux)

    if server:
        boot.write_compose_override()

    return boot, access


def run_setup(
    *,
    mode: str = "panel",
    regenerate: bool = False,
    bind_host: str | None = None,
    port: int | None = None,
    auto_port: bool = True,
    external_host: str | None = None,
) -> dict[str, object]:
    """
    Unified setup entry for CLI.

    mode:
      panel — credentials + dirs + config seeds only
      server — full self-host (deps + playwright + deploy files)
      docker — panel + skip local playwright (runs in container)
    """
    common = dict(
        regenerate_credentials=regenerate,
        bind_host=bind_host,
        port=port,
        auto_port=auto_port,
        external_host=external_host,
    )
    if mode == "panel":
        boot, access = bootstrap_server(
            server=False,
            install_deps=False,
            install_browser=False,
            **common,
        )
    elif mode == "docker":
        boot, access = bootstrap_server(
            server=True,
            install_deps=False,
            install_browser=False,
            **common,
        )
    else:
        boot, access = bootstrap_server(
            server=True,
            install_deps=True,
            install_browser=True,
            playwright_system_deps=True,
            **common,
        )

    return {
        "username": access.username,
        "password": access.password,
        "access": access,
        "steps": boot.steps_done,
        "warnings": boot.warnings,
        "platform": boot.platform,
        "panel_url": access.primary_access_url,
        "login_url": access.primary_login_url,
        "mode": mode,
    }
