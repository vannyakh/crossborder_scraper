"""MongoDB logical database driver."""

from __future__ import annotations

import shutil

from fastapi import HTTPException

from server.db_engines.base import EngineRuntimeContext
from server.db_engines.runtime import docker_exec, run_cli


class MongoDBDriver:
    platform_id = "mongodb"

    def provision_logical(
        self,
        ctx: EngineRuntimeContext,
        *,
        db_name: str,
        username: str,
        password: str,
        charset: str,
        access: str,
    ) -> None:
        del charset, access
        script = (
            f"db.getSiblingDB('{db_name}').createUser({{user: '{username}', "
            f"pwd: '{password}', roles: [{{role: 'readWrite', db: '{db_name}'}}]}});"
        )
        self._eval(ctx, script)

    def drop_logical(
        self,
        ctx: EngineRuntimeContext,
        *,
        db_name: str,
        username: str,
    ) -> None:
        script = (
            f"db.getSiblingDB('{db_name}').dropDatabase(); "
            f"db.getSiblingDB('admin').dropUser('{username}');"
        )
        self._eval(ctx, script)

    def _eval(self, ctx: EngineRuntimeContext, script: str) -> None:
        if ctx.container:
            docker_exec(
                ctx.container,
                [
                    "mongosh",
                    "--quiet",
                    "-u",
                    ctx.admin_user,
                    "-p",
                    ctx.admin_password,
                    "--authenticationDatabase",
                    "admin",
                    "--eval",
                    script,
                ],
            )
            return
        if not shutil.which("mongosh") and not shutil.which("mongo"):
            raise HTTPException(status_code=503, detail="mongosh client not found on PATH")
        cli = "mongosh" if shutil.which("mongosh") else "mongo"
        run_cli(
            [
                cli,
                "--quiet",
                "-u",
                ctx.admin_user,
                "-p",
                ctx.admin_password,
                "--authenticationDatabase",
                "admin",
                "--eval",
                script,
            ],
        )
