from fastapi import APIRouter
from celery.result import AsyncResult

from app.worker.celery_app import app as celery_app

router = APIRouter()


@router.get("/jobs/{task_id}")
async def get_job_status(task_id: str):
    """
    Poll the Celery result backend for a task's current state and return a
    shape that matches the frontend's JobPollResponse type:
      { job_id, status, progress, current_stage, error_traceback?, payload? }

    Celery state → frontend status mapping:
      PENDING  → PENDING   (task queued, not yet picked up by a worker)
      STARTED  → STARTED   (worker picked it up, no progress update yet)
      PROGRESS → STARTED   (worker is mid-execution; use progress meta)
      SUCCESS  → SUCCESS   (result.result contains ProfilerDataset)
      FAILURE  → FAILURE   (result.result is the exception)
    """
    result = AsyncResult(task_id, app=celery_app)
    state = result.state

    if state == "PENDING":
        return {
            "job_id": task_id,
            "status": "PENDING",
            "progress": 0,
            "current_stage": "Queued",
        }

    if state in ("STARTED", "RECEIVED"):
        return {
            "job_id": task_id,
            "status": "STARTED",
            "progress": 0,
            "current_stage": "Starting",
        }

    if state == "PROGRESS":
        meta = result.info or {}
        return {
            "job_id": task_id,
            "status": "STARTED",
            "progress": meta.get("progress", 0),
            "current_stage": meta.get("label", "Processing"),
        }

    if state == "SUCCESS":
        return {
            "job_id": task_id,
            "status": "SUCCESS",
            "progress": 100,
            "current_stage": "Complete",
            "payload": result.result,
        }

    # FAILURE, REVOKED, or anything else
    return {
        "job_id": task_id,
        "status": "FAILURE",
        "progress": 0,
        "current_stage": "Failed",
        "error_traceback": str(result.result) if result.result else state,
    }
