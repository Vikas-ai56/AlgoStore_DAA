# pyrefly: ignore [missing-import]
from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv(override=True)

REDIS_URL = f"redis://localhost:{os.getenv('REDIS_PORT', '6379')}"

app = Celery(
    "workers",
    broker=REDIS_URL,
    result_backend=REDIS_URL,
)

app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # Keep results long enough for the frontend to poll after a page refresh
    result_expires=3600,
)

