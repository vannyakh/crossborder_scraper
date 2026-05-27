from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str
    batch_id: str | None = None


class FileEntry(BaseModel):
    path: str
    name: str
    size_bytes: int
    modified_at: str
    kind: str


class FileListResponse(BaseModel):
    items: list[FileEntry]
    output_dir: str


class StatsResponse(BaseModel):
    products: int
    batches: int
    output_files: int
    running_batches: int
    cookies_sessions: dict[str, list[str]]
