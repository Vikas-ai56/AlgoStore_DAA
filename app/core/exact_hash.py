import hashlib
from pathlib import Path


def compute_sha256(data: bytes | Path) -> str:
    """Return hex SHA-256 of raw bytes or a file path."""
    if isinstance(data, Path):
        data = data.read_bytes()
    return hashlib.sha256(data).hexdigest()
