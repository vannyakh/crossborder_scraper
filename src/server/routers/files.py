from fastapi import HTTPException
from fastapi.responses import FileResponse

from server.deps import protected_router
from server.manager import get_manager
from server.schemas import FileEntry, FileListResponse

router = protected_router(prefix="/files", tags=["files"])


@router.get("", response_model=FileListResponse)
async def list_files(pattern: str = "*") -> FileListResponse:
    mgr = get_manager()
    items = [FileEntry(**f) for f in mgr.store.list_output_files(pattern=pattern)]
    return FileListResponse(items=items, output_dir=str(mgr.settings.output_dir))


@router.get("/{file_path:path}")
async def get_file(file_path: str, download: bool = False) -> FileResponse:
    mgr = get_manager()
    try:
        path = mgr.store.resolve_output_file(file_path)
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
    mgr = get_manager()
    try:
        mgr.store.delete_output_file(file_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="file not found") from exc
    return {"message": "deleted", "path": file_path}
