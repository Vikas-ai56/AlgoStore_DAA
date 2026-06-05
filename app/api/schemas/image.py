from pydantic import BaseModel


class UploadResponse(BaseModel):
    job_id: str
    storage_job_id: str | None = None


class StoredImageItem(BaseModel):
    image_id: str
    filename: str
    upload_timestamp: str
    width: int
    height: int
    file_size: int
    compression_ratio: float | None = None


class StoredImagesResponse(BaseModel):
    images: list[StoredImageItem]
    total: int
