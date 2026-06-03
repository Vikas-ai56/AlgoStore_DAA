import hashlib
import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.api.config import ALLOWED_CONTENT_TYPES, DEFAULT_Q_FACTOR, MAX_UPLOAD_BYTES, UPLOAD_DIR
from app.api.deps import get_db
from app.api.schemas.image import StoredImageItem, StoredImagesResponse, UploadResponse
from app.database.models import CompressionResult, Image
from app.services.storage_service import download_and_decompress
from app.worker.profiler_task import profile_image
from app.worker.tasks import process_compressed_image

router = APIRouter()


@router.post("/profiler/upload", response_model=UploadResponse)
async def upload_for_profiling(file: UploadFile = File(...)):
    """
    Accept an image file, persist it to disk, and enqueue both the
    profile_image (visualization) and process_compressed_image (MinIO storage)
    Celery tasks. Returns both task ids so the frontend can poll visualization
    progress and later retrieve the image_id for decompression.
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported media type: {file.content_type}")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large (max {MAX_UPLOAD_BYTES // 1024 // 1024} MB)")

    sha256_prefix = hashlib.sha256(contents).hexdigest()[:12]
    suffix = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "png"
    dest = UPLOAD_DIR / f"{sha256_prefix}_{uuid.uuid4().hex}.{suffix}"
    dest.write_bytes(contents)

    profile_task = profile_image.delay(str(dest), q_factor=DEFAULT_Q_FACTOR)
    storage_task = process_compressed_image.delay(
        str(dest),
        quantization_factor=DEFAULT_Q_FACTOR,
        upload_needed=True,
        delete_source=True,
    )
    return UploadResponse(job_id=profile_task.id, storage_job_id=storage_task.id)


@router.get("/images/{image_id}/decompress")
async def decompress_image_endpoint(image_id: str):
    """
    Retrieve the compressed .bin from MinIO for the given image_id, run
    the full Huffman + IDCT decompression pipeline on all 3 BGR channels,
    and return the reconstructed image as a JPEG.
    """
    try:
        jpeg_bytes, filename = download_and_decompress(image_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Decompression failed: {exc}")

    safe_name = filename.replace('"', '').replace('\n', '').replace('\r', '').replace(';', '')
    return StreamingResponse(
        io.BytesIO(jpeg_bytes),
        media_type="image/jpeg",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


@router.get("/images", response_model=StoredImagesResponse)
def list_stored_images(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    total: int = db.query(func.count(Image.image_id)).scalar() or 0
    rows = (
        db.query(Image, CompressionResult)
        .outerjoin(CompressionResult, CompressionResult.image_id == Image.image_id)
        .order_by(desc(Image.upload_timestamp))
        .offset(offset)
        .limit(limit)
        .all()
    )
    items = [
        StoredImageItem(
            image_id=img.image_id,
            filename=img.filename,
            upload_timestamp=img.upload_timestamp.isoformat(),
            width=img.width,
            height=img.height,
            file_size=img.file_size,
            compression_ratio=res.compression_ratio if res else None,
        )
        for img, res in rows
    ]
    return StoredImagesResponse(images=items, total=total)
