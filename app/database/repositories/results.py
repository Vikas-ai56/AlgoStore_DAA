from sqlalchemy.orm import Session

from app.database.models import CompressionResult


class CompressionResultRepository:
    """
    Stores and retrieves per-image compression metadata.
    Useful for rendering the history of compression runs, comparing
    how RLE / Huffman / quantization quality varied across images.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_by_image_id(self, image_id: str) -> CompressionResult | None:
        return (
            self.db.query(CompressionResult)
            .filter(CompressionResult.image_id == image_id)
            .first()
        )

    def list_for_image(self, image_id: str) -> list[CompressionResult]:
        return (
            self.db.query(CompressionResult)
            .filter(CompressionResult.image_id == image_id)
            .all()
        )

    def add(self, result: CompressionResult) -> CompressionResult:
        self.db.add(result)
        self.db.flush()
        return result
