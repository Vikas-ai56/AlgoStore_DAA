from .celery_app import app
from . import tasks          # noqa: F401 — registers process_compressed_image
from . import profiler_task  # noqa: F401 — registers profile_image

__all__ = ["app"]
