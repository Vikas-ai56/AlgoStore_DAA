from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv(override = True)

REDIS_URL = f"http://localhost:{os.getenv("REDIS_PORT")}"

app = Celery("workers", broker = REDIS_URL)

