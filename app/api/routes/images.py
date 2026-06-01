from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_images():
    # TODO: implement paginated gallery
    return {"images": [], "total": 0}
