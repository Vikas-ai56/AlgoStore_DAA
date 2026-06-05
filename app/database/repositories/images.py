from sqlalchemy.orm import Session

from app.database.models import Image


class ImageRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, image_id: str) -> Image | None:
        return self.db.query(Image).filter(Image.image_id == image_id).first()

    def get_by_sha256(self, sha256: str) -> Image | None:
        return self.db.query(Image).filter(Image.sha256 == sha256).first()

    def list_all(self, limit: int = 100, offset: int = 0) -> list[Image]:
        return self.db.query(Image).offset(offset).limit(limit).all()

    def add(self, image: Image) -> Image:
        self.db.add(image)
        self.db.flush()
        return image

    def delete(self, image_id: str) -> bool:
        n = self.db.query(Image).filter(Image.image_id == image_id).delete()
        return n > 0
