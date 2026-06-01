from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_jobs():
    # TODO: implement job listing from DB
    return {"jobs": [], "total": 0}
