from typing import Any

from pydantic import BaseModel


class CompressionMetrics(BaseModel):
    psnr_db: float
    ssim: float
    original_bits: int
    compressed_bits: int
    compression_ratio: float


class CompressionAnalysisResponse(BaseModel):
    metrics: CompressionMetrics
    # steps and meta contain numpy-derived data; typed loosely
    steps: dict[str, Any]
    meta: dict[str, Any]


class PhashDebugResponse(BaseModel):
    # All 6 intermediate pHash arrays (lists of lists) plus the hash string
    hash: str
    data: dict[str, Any]
