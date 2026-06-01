import hashlib
from pathlib import Path

import cv2
import numpy as np


def compute_sha256(source: str | Path | np.ndarray | bytes) -> str:
    """Return the SHA-256 hex digest of an image file, raw bytes, or numpy array."""
    if isinstance(source, (str, Path)):
        raw = Path(source).read_bytes()
    elif isinstance(source, np.ndarray):
        raw = source.tobytes()
    elif isinstance(source, bytes):
        raw = source
    else:
        raise TypeError(f"Unsupported source type: {type(source)}")
    return hashlib.sha256(raw).hexdigest()


def compare_sha256(a: str | Path | np.ndarray | bytes, b: str | Path | np.ndarray | bytes) -> bool:
    """Return True if both sources produce the same SHA-256 digest (exact duplicate)."""
    return compute_sha256(a) == compute_sha256(b)
