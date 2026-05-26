import json
from datetime import datetime

from sqlalchemy import DateTime, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

from config import Settings
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


class ProductStore:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()
        self.settings.ensure_dirs()
        self.engine = create_engine(f"sqlite:///{self.settings.db_path}")
        Base.metadata.create_all(self.engine)

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

    def get_by_url(self, url: str) -> ScrapedProduct | None:
        with Session(self.engine) as session:
            record = session.scalar(select(ProductRecord).where(ProductRecord.source_url == url))
            if not record:
                return None
            return ScrapedProduct.model_validate_json(record.payload_json)

    def export_json_file(self, product: ScrapedProduct) -> str:
        path = self.settings.output_dir / f"{product.source.value}_{product.source_product_id}.json"
        path.write_text(
            json.dumps(product.model_dump(mode="json"), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        return str(path)
