from typing import Any, Literal

from pydantic import BaseModel


class JobPollResponse(BaseModel):
    job_id: str
    status: Literal["PENDING", "STARTED", "SUCCESS", "FAILURE"]
    progress: int
    current_stage: str
    error_traceback: str | None = None
    # payload is the full ProfilerDataset; typed as Any because it's a large
    # nested structure that we don't want to re-validate on every poll response
    payload: Any | None = None
