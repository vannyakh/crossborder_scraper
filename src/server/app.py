from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from server.api.registry import register_routes
from server.bootstrap import panel_lifespan
from server.core.constants import APP_VERSION


def create_app() -> FastAPI:
    application = FastAPI(
        title="Crossborder Scraper API",
        version=APP_VERSION,
        description="Gateway control plane: scrape, AI agent, workflows, export.",
        lifespan=panel_lifespan,
    )
    register_routes(application)

    @application.get("/")
    async def root() -> RedirectResponse:
        return RedirectResponse(url="/ui")

    return application


app = create_app()
