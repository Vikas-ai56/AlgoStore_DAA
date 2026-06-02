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

