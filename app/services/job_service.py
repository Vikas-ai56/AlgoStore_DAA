from celery.result import AsyncResult

from app.worker.celery_app import app as celery_app


def get_job_status(task_id: str) -> dict:
    """
    Fetch the current status of a Celery task.

    Possible statuses:
      PENDING   - task not yet picked up (or unknown id)
      STARTED   - worker has begun processing
      PROGRESS  - worker reported a progress update via update_state()
      SUCCESS   - task completed successfully
      FAILURE   - task raised an exception
      REVOKED   - task was cancelled
    """
    result = AsyncResult(task_id, app=celery_app)
    state = result.state

    payload: dict = {"task_id": task_id, "status": state}

    if state == "PROGRESS":
        payload["progress"] = result.info or {}
    elif state == "SUCCESS":
        payload["result"] = result.result
    elif state == "FAILURE":
        payload["error"] = str(result.result)
        payload["traceback"] = result.traceback

    return payload


def cancel_job(task_id: str) -> dict:
    """Revoke (cancel) a pending or running task."""
    celery_app.control.revoke(task_id, terminate=True)
    return {"task_id": task_id, "status": "REVOKED"}
