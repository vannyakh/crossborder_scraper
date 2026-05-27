from fastapi import HTTPException
from fastapi.responses import FileResponse

from server.deps import protected_router
from server.schemas import FileEntry, FileListResponse
from server.services.context import get_context

router = protected_router(prefix="/files", tags=["files"])


@router.get("", response_model=FileListResponse)
async def list_files(pattern: str = "*") -> FileListResponse:
    ctx = get_context()
    items = [FileEntry(**f) for f in ctx.store.list_output_files(pattern=pattern)]
    return FileListResponse(items=items, output_dir=str(ctx.settings.output_dir))


@router.get("/{file_path:path}")
async def get_file(file_path: str, download: bool = False) -> FileResponse:
    ctx = get_context()
    try:
        path = ctx.store.resolve_output_file(file_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="file not found") from exc

    media = "application/json" if path.suffix == ".json" else "text/html"
    return FileResponse(
        path,
        media_type=media,
        filename=path.name if download else None,
    )


@router.delete("/{file_path:path}")
async def delete_file(file_path: str) -> dict[str, str]:
    ctx = get_context()
    try:
        ctx.store.delete_output_file(file_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="file not found") from exc
    return {"message": "deleted", "path": file_path}
