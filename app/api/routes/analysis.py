from fastapi import APIRouter

router = APIRouter()


@router.get("/stats")
async def get_stats():
    # TODO: implement aggregate compression statistics
    return {"total_images": 0, "bytes_saved": 0, "avg_compression_ratio": 0.0}
