"""API-level configuration: file upload limits, allowed types, quantization defaults."""

from pathlib import Path

MAX_UPLOAD_BYTES = 20 * 1024 * 1024   # 20 MB
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp", "image/bmp", "image/tiff"}

DEFAULT_Q_FACTOR = 24.0
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "assets" / "uploads"
