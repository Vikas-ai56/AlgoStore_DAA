from fastapi import APIRouter, File, HTTPException, UploadFile
import cv2
import numpy as np

from app.services.analysis_service import get_compression_analysis, get_phash_debug

router = APIRouter()


@router.post("/analysis/compress")
async def analyze_compression(file: UploadFile = File(...), q_factor: float = 24.0):
    """
    Synchronous single-channel compression analysis (grayscale).
    Returns PSNR, SSIM, and all 8 pipeline steps without going through Celery.
    Good for quick demos; use /profiler/upload for the full 3-channel async flow.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Only image files are accepted")

    data = await file.read()
    arr = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=422, detail="Cannot decode image")

    result = get_compression_analysis(image, quantization_factor=q_factor)

    # Convert numpy arrays in steps to plain lists for JSON
    steps = result["steps"]
    serializable_steps = {}
    for key, val in steps.items():
        if isinstance(val, np.ndarray):
            serializable_steps[key] = val.tolist()
        else:
            serializable_steps[key] = val

    return {
        "metrics": result["metrics"],
        "steps": serializable_steps,
        "meta": result["meta"],
    }


@router.post("/analysis/phash")
async def analyze_phash(file: UploadFile = File(...)):
    """Return all 6 perceptual-hash intermediate arrays for visualization."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Only image files are accepted")

    data = await file.read()
    arr = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=422, detail="Cannot decode image")

    debug = get_phash_debug(image)
    serializable = {}
    for key, val in debug.items():
        if isinstance(val, np.ndarray):
            serializable[key] = val.tolist()
        else:
            serializable[key] = val
    return serializable
