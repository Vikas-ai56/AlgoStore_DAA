from fastapi import APIRouter

from app.api.schemas.job import JobPollResponse
from app.services.job_service import cancel_job, get_job_status

router = APIRouter()


@router.get("/jobs/{task_id}", response_model=JobPollResponse)
async def poll_job(task_id: str):
    """
    Poll the Celery result backend for a task's state.

    Status lifecycle: PENDING → STARTED → (PROGRESS updates) → SUCCESS | FAILURE

    On SUCCESS the response includes `payload` — a ProfilerDataset with all
    8 algorithm steps for all 3 YCbCr channels, ready for the frontend visualizer.
    """
    raw = get_job_status(task_id)

    # Map job_service's shape to the frontend's JobPollResponse contract
    state = raw["status"]

    if state == "PENDING":
        return JobPollResponse(job_id=task_id, status="PENDING", progress=0, current_stage="Queued")

    if state in ("STARTED", "RECEIVED"):
        return JobPollResponse(job_id=task_id, status="STARTED", progress=0, current_stage="Starting")

    if state == "PROGRESS":
        meta = raw.get("progress") or {}
        return JobPollResponse(
            job_id=task_id,
            status="STARTED",
            progress=meta.get("progress", 0),
            current_stage=meta.get("label", "Processing"),
        )

    if state == "SUCCESS":
        return JobPollResponse(
            job_id=task_id,
            status="SUCCESS",
            progress=100,
            current_stage="Complete",
            payload=raw.get("result"),
        )

    # FAILURE, REVOKED, or unknown
    return JobPollResponse(
        job_id=task_id,
        status="FAILURE",
        progress=0,
        current_stage="Failed",
        error_traceback=raw.get("error", state),
    )


@router.delete("/jobs/{task_id}")
async def revoke_job(task_id: str):
    """Cancel a pending or running task."""
    return cancel_job(task_id)
