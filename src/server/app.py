from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse

from config import get_settings
from deploy.panel_security import effective_entry_path
from server.api.registry import register_routes
from server.bootstrap import panel_lifespan
from server.core.constants import APP_VERSION
from server.middleware.panel_entrance import add_panel_entrance_middleware
from server.middleware.panel_entrance_html import (
    _PANEL_NOT_FOUND_MESSAGE,
    panel_entrance_html,
    wants_panel_html,
)


def create_app() -> FastAPI:
    application = FastAPI(
        title="Cross-Border API",
        version=APP_VERSION,
        description="Gateway control plane: scrape, AI agent, workflows, export.",
        lifespan=panel_lifespan,
    )
    register_routes(application)
    add_panel_entrance_middleware(application)

    @application.get("/", response_model=None)
    async def root(request: Request) -> Response:
        settings = get_settings()
        entry = effective_entry_path(settings.panel_entry_path)
        if entry:
            if wants_panel_html(request):
                from starlette.responses import HTMLResponse

                return HTMLResponse(
                    panel_entrance_html(
                        title="Page not found",
                        message=_PANEL_NOT_FOUND_MESSAGE,
                        entry_prefix=f"/{entry}",
                    ),
                    status_code=404,
                )
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        return RedirectResponse(url="/ui/")

    return application


app = create_app()
