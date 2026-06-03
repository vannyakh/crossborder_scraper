from fastapi import HTTPException
from fastapi.responses import FileResponse

from server.deps import protected_router
from server.services.image_generation_service import get_image_generation_service

router = protected_router(prefix="/uploads", tags=["uploads"])


@router.get("/{file_path:path}")
async def get_upload(file_path: str) -> FileResponse:
    """Serve files from the panel uploads directory (generated images, etc.)."""
    svc = get_image_generation_service()
    try:
        path, media_type = svc.resolve_upload(file_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="file not found") from exc
    return FileResponse(path, media_type=media_type)
