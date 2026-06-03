"""
Celery task that runs the full compression pipeline on all three YCbCr channels
and returns visualization data (all 8 algorithm steps) + quality metrics.

The image is downscaled to MAX_DIM before profiling — this keeps the Celery
result small enough for Redis while still showing every algorithm step clearly.
"""

import time
from collections import Counter
from pathlib import Path

import cv2
import numpy as np

from app.core.compression import Huffman, _dct2, dct_dequantize_reconstruct
from app.services.analysis_service import compute_psnr, compute_ssim
from .celery_app import app

MAX_DIM = 128

_JPEG_QMAT_BASE = np.array(
    [
        [16, 11, 10, 16, 24, 40, 51, 61],
        [12, 12, 14, 19, 26, 58, 60, 55],
        [14, 13, 16, 24, 40, 57, 69, 56],
        [14, 17, 22, 29, 51, 87, 80, 62],
        [18, 22, 37, 56, 68, 109, 103, 77],
        [24, 35, 55, 64, 81, 104, 113, 92],
        [49, 64, 78, 87, 103, 121, 120, 101],
        [72, 92, 95, 98, 112, 100, 103, 99],
    ],
    dtype=np.float32,
)


def _build_q_matrix(q_factor: float) -> np.ndarray:
    qmat = _JPEG_QMAT_BASE * float(q_factor)
    qmat[qmat < 1] = 1
    return qmat


def _tree_to_dict(node, depth: int = 0, max_depth: int = 12):
    """Serialize a HuffmanNode tree; cap depth and stringify tuple symbols."""
    if node is None or depth > max_depth:
        return None
    return {
        "freq": int(node.frequency),
        "symbol": str(node.value) if node.value is not None else None,
        "left": _tree_to_dict(node.left, depth + 1, max_depth),
        "right": _tree_to_dict(node.right, depth + 1, max_depth),
    }


def _profile_channel(channel: np.ndarray, q_factor: float) -> dict:
    """Run the full DCT → quantize → RLE → Huffman pipeline on one channel."""
    h, w = channel.shape
    pad_h = (8 - (h % 8)) % 8
    pad_w = (8 - (w % 8)) % 8
    padded = np.pad(
        channel.astype(np.float32), ((0, pad_h), (0, pad_w)), mode="constant"
    )
    pH, pW = padded.shape
    qmat = _build_q_matrix(q_factor)

    shifted = padded - 128.0
    raw_dct = np.zeros_like(shifted, dtype=np.float64)
    for i in range(0, pH, 8):
        for j in range(0, pW, 8):
            raw_dct[i : i + 8, j : j + 8] = _dct2(shifted[i : i + 8, j : j + 8])

    # Tile the 8×8 qmat to cover the full padded image before dividing
    qmat_tiled = np.tile(qmat, (pH // 8, pW // 8))
    quantized = np.round(raw_dct / qmat_tiled).astype(np.int16)

    huff = Huffman()
    rle_encoded = huff.rle_encode(quantized)
    freq_table = Counter(rle_encoded)
    codes = huff.huffman_encode(freq_table)

    bitstream_len = sum(len(codes[s]) for s in rle_encoded) if codes else 0
    reconstructed = dct_dequantize_reconstruct(quantized, (h, w), (pH, pW), q_factor=q_factor)
    zero_fraction = float(np.sum(quantized == 0)) / max(quantized.size, 1)

    code_table = sorted(
        [{"symbol": str(sym), "code": code, "length": len(code)} for sym, code in codes.items()],
        key=lambda x: x["length"],
    )[:100]

    return {
        "step1_padded_pixels": padded.clip(0, 255).astype(np.uint8).tolist(),
        "step2_dct_coefficients": np.round(raw_dct, 2).tolist(),
        "step3_q_matrix": qmat.tolist(),
        "step4_quantized_blocks": quantized.tolist(),
        "zero_fraction": zero_fraction,
        "step5_rle_stream": [list(pair) for pair in rle_encoded[:500]],
        "step6_huffman_tree": _tree_to_dict(huff.tree),
        "step7_code_table": code_table,
        "step8_reconstructed_pixels": reconstructed.tolist(),
        # internal — stripped before returning from the task
        "_original": channel.astype(np.uint8),
        "_reconstructed": reconstructed,
        "_bitstream_len": bitstream_len,
    }


@app.task(bind=True, name="worker.profile_image")
def profile_image(self, image_path: str, q_factor: float = 24.0):
    def _progress(step: int, total: int, label: str):
        self.update_state(
            state="PROGRESS",
            meta={"step": step, "total": total, "label": label, "progress": round(step / total * 100)},
        )

    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    _progress(1, 7, "Loading image")
    bgr = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError(f"Cannot decode image: {image_path}")

    _progress(2, 7, "Resizing for visualization")
    orig_h, orig_w = bgr.shape[:2]
    scale = min(MAX_DIM / orig_h, MAX_DIM / orig_w, 1.0)
    if scale < 1.0:
        new_h, new_w = max(8, int(orig_h * scale)), max(8, int(orig_w * scale))
        bgr = cv2.resize(bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)

    vis_h, vis_w = bgr.shape[:2]
    pad_h = (8 - (vis_h % 8)) % 8
    pad_w = (8 - (vis_w % 8)) % 8

    _progress(3, 7, "Converting to YCbCr")
    # OpenCV COLOR_BGR2YCrCb gives (Y, Cr, Cb) order
    ycbcr = cv2.cvtColor(bgr, cv2.COLOR_BGR2YCrCb)
    y_ch, cr_ch, cb_ch = cv2.split(ycbcr)

    t0 = time.perf_counter()
    _progress(4, 7, "Profiling Y channel")
    y_data = _profile_channel(y_ch, q_factor)
    t1 = time.perf_counter()

    _progress(5, 7, "Profiling Cb channel")
    cb_data = _profile_channel(cb_ch, q_factor)
    t2 = time.perf_counter()

    _progress(6, 7, "Profiling Cr channel")
    cr_data = _profile_channel(cr_ch, q_factor)
    t3 = time.perf_counter()

    _progress(7, 7, "Computing quality metrics")
    psnr = compute_psnr(y_data["_original"], y_data["_reconstructed"])
    ssim_val = compute_ssim(y_data["_original"], y_data["_reconstructed"])

    for d in (y_data, cb_data, cr_data):
        d.pop("_original")
        d.pop("_reconstructed")
        d.pop("_bitstream_len")

    try:
        path.unlink()
    except Exception:
        pass

    return {
        "metadata": {
            "original_dims": [orig_h, orig_w],
            "padded_dims": [vis_h + pad_h, vis_w + pad_w],
            "q_factor": q_factor,
        },
        "metrics": {
            "psnr": psnr,
            "ssim": ssim_val,
            "layer_timings_us": {
                "y_channel_us": int((t1 - t0) * 1e6),
                "cb_channel_us": int((t2 - t1) * 1e6),
                "cr_channel_us": int((t3 - t2) * 1e6),
            },
            "memory_peak_bytes": 0,
        },
        "channels": {
            "y_channel": y_data,
            "cb_channel": cb_data,
            "cr_channel": cr_data,
        },
    }
