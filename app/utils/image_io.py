from pathlib import Path

import cv2
import numpy as np


def load_image(path: str | Path, grayscale: bool = False) -> np.ndarray:
    """Load an image from disk. Returns a BGR (or grayscale) uint8 numpy array."""
    flag = cv2.IMREAD_GRAYSCALE if grayscale else cv2.IMREAD_COLOR
    img = cv2.imread(str(path), flag)
    if img is None:
        raise FileNotFoundError(f"Could not read image: {path}")
    return img


def save_image(image: np.ndarray, path: str | Path) -> None:
    """Save a numpy array as an image file. Format inferred from extension."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    ok = cv2.imwrite(str(path), image)
    if not ok:
        raise OSError(f"Failed to write image: {path}")


def array_to_bytes(image: np.ndarray, ext: str = ".png") -> bytes:
    """Encode a numpy array to an in-memory image byte string."""
    ok, buf = cv2.imencode(ext, image)
    if not ok:
        raise OSError(f"Failed to encode image as {ext}")
    return buf.tobytes()


def bytes_to_array(data: bytes) -> np.ndarray:
    """Decode an in-memory image byte string to a numpy array."""
    buf = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image bytes")
    return img
