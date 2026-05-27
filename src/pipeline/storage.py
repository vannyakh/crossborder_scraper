import json
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import DateTime, Integer, String, Text, create_engine, desc, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

from config import Settings
from core.engine.jobs import BatchReport, JobResult
from core.models import ScrapedProduct


class Base(DeclarativeBase):
    pass


class ProductRecord(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(32), index=True)
    source_product_id: Mapped[str] = mapped_column(String(64), index=True)
    source_url: Mapped[str] = mapped_column(String(512), unique=True)
    title: Mapped[str] = mapped_column(String(512))
    payload_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class BatchRecord(Base):
    __tablename__ = "batches"

    batch_id: Mapped[str] = mapped_column(String(16), primary_key=True)
    status: Mapped[str] = mapped_column(String(16), index=True, default="running")
    total: Mapped[int] = mapped_column(Integer, default=0)
    completed: Mapped[int] = mapped_column(Integer, default=0)
    success: Mapped[int] = mapped_column(Integer, default=0)
    failed: Mapped[int] = mapped_column(Integer, default=0)
    workers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    use_ai: Mapped[int] = mapped_column(Integer, default=0)
    save_results: Mapped[int] = mapped_column(Integer, default=1)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class JobRecord(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    batch_id: Mapped[str] = mapped_column(String(16), index=True)
    job_id: Mapped[str] = mapped_column(String(16), index=True)
    url: Mapped[str] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(16), index=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(nullable=True)
    proxy_used: Mapped[str | None] = mapped_column(String(256), nullable=True)
    ai_used: Mapped[int] = mapped_column(Integer, default=0)
    product_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    product_title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    finished_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ProductStore:
    """SQLite store for scraped products, batches, and job history."""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()
        self.settings.ensure_dirs()
        self.engine = create_engine(f"sqlite:///{self.settings.db_path}")
        Base.metadata.create_all(self.engine)

    # --- Products ---

    def save(self, product: ScrapedProduct) -> int:
        with Session(self.engine) as session:
            existing = session.scalar(
                select(ProductRecord).where(ProductRecord.source_url == product.source_url)
            )
            payload = product.model_dump_json()
            if existing:
                existing.title = product.title
                existing.payload_json = payload
                existing.updated_at = datetime.utcnow()
                session.commit()
                return existing.id
            record = ProductRecord(
                source=product.source.value,
                source_product_id=product.source_product_id,
                source_url=product.source_url,
                title=product.title,
                payload_json=payload,
            )
            session.add(record)
            session.commit()
            session.refresh(record)
            return record.id

    def get_by_id(self, product_id: int) -> ScrapedProduct | None:
        with Session(self.engine) as session:
            record = session.get(ProductRecord, product_id)
            if not record:
                return None
            return ScrapedProduct.model_validate_json(record.payload_json)

    def get_by_url(self, url: str) -> ScrapedProduct | None:
        with Session(self.engine) as session:
            record = session.scalar(select(ProductRecord).where(ProductRecord.source_url == url))
            if not record:
                return None
            return ScrapedProduct.model_validate_json(record.payload_json)

    def list_products(
        self, *, limit: int = 50, offset: int = 0, source: str | None = None
    ) -> list[dict]:
        with Session(self.engine) as session:
            q = select(ProductRecord).order_by(desc(ProductRecord.updated_at))
            if source:
                q = q.where(ProductRecord.source == source)
            rows = session.scalars(q.offset(offset).limit(limit)).all()
            return [
                {
                    "id": r.id,
                    "source": r.source,
                    "source_product_id": r.source_product_id,
                    "source_url": r.source_url,
                    "title": r.title,
                    "created_at": r.created_at.isoformat(),
                    "updated_at": r.updated_at.isoformat(),
                }
                for r in rows
            ]

    def count_products(self, source: str | None = None) -> int:
        with Session(self.engine) as session:
            q = select(func.count()).select_from(ProductRecord)
            if source:
                q = q.where(ProductRecord.source == source)
            return session.scalar(q) or 0

    def delete_product(self, product_id: int) -> bool:
        with Session(self.engine) as session:
            record = session.get(ProductRecord, product_id)
            if not record:
                return False
            session.delete(record)
            session.commit()
            return True

    def export_json_file(self, product: ScrapedProduct) -> str:
        path = self.settings.output_dir / f"{product.source.value}_{product.source_product_id}.json"
        path.write_text(
            json.dumps(product.model_dump(mode="json"), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        return str(path)

    # --- Batches & jobs ---

    def create_batch(
        self,
        batch_id: str,
        *,
        total: int,
        workers: int | None,
        use_ai: bool,
        save: bool,
    ) -> None:
        with Session(self.engine) as session:
            session.add(
                BatchRecord(
                    batch_id=batch_id,
                    status="running",
                    total=total,
                    workers=workers,
                    use_ai=1 if use_ai else 0,
                    save_results=1 if save else 0,
                )
            )
            session.commit()

    def update_batch_progress(
        self,
        batch_id: str,
        *,
        completed: int,
        success: int,
        failed: int,
        status: str | None = None,
    ) -> None:
        with Session(self.engine) as session:
            batch = session.get(BatchRecord, batch_id)
            if not batch:
                return
            batch.completed = completed
            batch.success = success
            batch.failed = failed
            if status:
                batch.status = status
            session.commit()

    def finish_batch(self, batch_id: str, report: BatchReport, status: str = "completed") -> None:
        with Session(self.engine) as session:
            batch = session.get(BatchRecord, batch_id)
            if batch:
                batch.status = status
                batch.completed = report.total
                batch.success = report.success
                batch.failed = report.failed
                batch.finished_at = report.finished_at or datetime.utcnow()
            session.commit()
        for result in report.results:
            self.save_job_result(batch_id, result)

    def save_job_result(self, batch_id: str, result: JobResult) -> None:
        product_id: int | None = None
        product_title: str | None = None
        if result.product:
            product_id = self.save(result.product)
            product_title = result.product.title

        with Session(self.engine) as session:
            session.add(
                JobRecord(
                    batch_id=batch_id,
                    job_id=result.job_id,
                    url=result.url,
                    status=result.status.value,
                    error=result.error,
                    duration_seconds=result.duration_seconds,
                    proxy_used=result.proxy_used,
                    ai_used=1 if result.ai_used else 0,
                    product_id=product_id,
                    product_title=product_title,
                    finished_at=result.finished_at,
                )
            )
            session.commit()

    def list_batches(self, *, limit: int = 30, offset: int = 0) -> list[dict]:
        with Session(self.engine) as session:
            rows = session.scalars(
                select(BatchRecord).order_by(desc(BatchRecord.started_at)).offset(offset).limit(limit)
            ).all()
            return [
                {
                    "batch_id": b.batch_id,
                    "status": b.status,
                    "total": b.total,
                    "completed": b.completed,
                    "success": b.success,
                    "failed": b.failed,
                    "workers": b.workers,
                    "use_ai": bool(b.use_ai),
                    "save_results": bool(b.save_results),
                    "started_at": b.started_at.isoformat(),
                    "finished_at": b.finished_at.isoformat() if b.finished_at else None,
                }
                for b in rows
            ]

    def get_batch(self, batch_id: str) -> dict | None:
        with Session(self.engine) as session:
            batch = session.get(BatchRecord, batch_id)
            if not batch:
                return None
            jobs = session.scalars(
                select(JobRecord).where(JobRecord.batch_id == batch_id).order_by(JobRecord.id)
            ).all()
            return {
                "batch_id": batch.batch_id,
                "status": batch.status,
                "total": batch.total,
                "completed": batch.completed,
                "success": batch.success,
                "failed": batch.failed,
                "workers": batch.workers,
                "use_ai": bool(batch.use_ai),
                "save_results": bool(batch.save_results),
                "started_at": batch.started_at.isoformat(),
                "finished_at": batch.finished_at.isoformat() if batch.finished_at else None,
                "results": [
                    {
                        "job_id": j.job_id,
                        "url": j.url,
                        "status": j.status,
                        "error": j.error,
                        "duration_seconds": j.duration_seconds,
                        "proxy_used": j.proxy_used,
                        "ai_used": bool(j.ai_used),
                        "product_id": j.product_id,
                        "product": {"title": j.product_title} if j.product_title else None,
                    }
                    for j in jobs
                ],
            }

    def count_batches(self) -> int:
        with Session(self.engine) as session:
            return session.scalar(select(func.count()).select_from(BatchRecord)) or 0

    # --- Output files ---

    def list_output_files(self, *, pattern: str = "*") -> list[dict[str, Any]]:
        root = self.settings.output_dir.resolve()
        if not root.exists():
            return []
        files: list[dict[str, Any]] = []
        for path in sorted(root.rglob(pattern)):
            if not path.is_file():
                continue
            rel = path.relative_to(root).as_posix()
            stat = path.stat()
            files.append(
                {
                    "path": rel,
                    "name": path.name,
                    "size_bytes": stat.st_size,
                    "modified_at": datetime.utcfromtimestamp(stat.st_mtime).isoformat(),
                    "kind": path.suffix.lstrip(".") or "file",
                }
            )
        return files

    def resolve_output_file(self, relative_path: str) -> Path:
        root = self.settings.output_dir.resolve()
        target = (root / relative_path).resolve()
        if not str(target).startswith(str(root)):
            raise ValueError("path escapes output directory")
        if not target.is_file():
            raise FileNotFoundError(relative_path)
        return target

    def delete_output_file(self, relative_path: str) -> bool:
        path = self.resolve_output_file(relative_path)
        path.unlink()
        return True
