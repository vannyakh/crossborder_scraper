from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse, RedirectResponse

from config import get_settings
from deploy.panel_security import normalize_entry_path
from server.api.registry import register_routes
from server.bootstrap import panel_lifespan
from server.core.constants import APP_VERSION
from server.middleware.panel_entrance import add_panel_entrance_middleware


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
    async def root() -> Response:
        settings = get_settings()
        if normalize_entry_path(settings.panel_entry_path):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        return RedirectResponse(url="/ui")

    return application


app = create_app()
