import hashlib
import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.api.config import ALLOWED_CONTENT_TYPES, DEFAULT_Q_FACTOR, MAX_UPLOAD_BYTES, UPLOAD_DIR
from app.api.schemas.image import UploadResponse
from app.worker.profiler_task import profile_image

router = APIRouter()


@router.post("/profiler/upload", response_model=UploadResponse)
async def upload_for_profiling(file: UploadFile = File(...)):
    """
    Accept an image file, persist it to disk, and enqueue the profile_image
    Celery task.  Returns the Celery task id as job_id so the frontend can poll.

    SHA-256 of the raw bytes is used as the filename prefix so the same image
    uploaded twice maps to the same file on disk (the task overwrites it safely).
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

    task = profile_image.delay(str(dest), q_factor=DEFAULT_Q_FACTOR)
    return UploadResponse(job_id=task.id)
