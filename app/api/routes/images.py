import hashlib
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.worker.profiler_task import profile_image

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parents[3] / "assets" / "uploads"


@router.post("/profiler/upload")
async def upload_for_profiling(file: UploadFile = File(...)):
    """
    Accept an image file, persist it to disk, and enqueue the profile_image
    Celery task.  Returns the Celery task id as job_id so the frontend can poll.

    SHA-256 of the raw bytes is used as the filename prefix so the same image
    uploaded twice maps to the same file on disk (the task overwrites it safely).
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Only image files are accepted")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    sha256_prefix = hashlib.sha256(contents).hexdigest()[:12]
    suffix = Path(file.filename or "upload.bin").suffix or ".png"
    dest = UPLOAD_DIR / f"{sha256_prefix}_{uuid.uuid4().hex}{suffix}"
    dest.write_bytes(contents)

    task = profile_image.delay(str(dest), q_factor=24.0)
    return {"job_id": task.id}
