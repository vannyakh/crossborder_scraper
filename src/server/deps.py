from fastapi import APIRouter, Depends

from server.auth import require_panel_auth


def protected_router(*args, **kwargs) -> APIRouter:
    """APIRouter that requires panel HTTP Basic auth on all routes."""
    deps = list(kwargs.pop("dependencies", []))
    deps.append(Depends(require_panel_auth))
    return APIRouter(*args, dependencies=deps, **kwargs)
