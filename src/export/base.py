from abc import ABC, abstractmethod

from core.models import ExportListing


class BaseExporter(ABC):
    marketplace: str

    @abstractmethod
    async def publish(self, listing: ExportListing) -> dict:
        """Publish listing to marketplace. Returns API response metadata."""
        ...

    @abstractmethod
    def validate_credentials(self) -> bool:
        ...
