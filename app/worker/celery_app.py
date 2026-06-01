from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv(override=True)

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", f"redis://{REDIS_HOST}:{REDIS_PORT}/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", f"redis://{REDIS_HOST}:{REDIS_PORT}/1")

app = Celery(
    "workers",
    broker=CELERY_BROKER_URL,
    result_backend=CELERY_RESULT_BACKEND,
)
app.conf.result_expires = 3600

