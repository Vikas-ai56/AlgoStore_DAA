import numpy as np
import cv2
from skimage.metrics import structural_similarity as ssim

from app.core.compression import compress_image
from app.core.phash import compute_phash


def compute_psnr(original: np.ndarray, reconstructed: np.ndarray) -> float:
    """PSNR between two grayscale uint8 images. Returns inf when images are identical."""
    original = original.astype(np.float64)
    reconstructed = reconstructed.astype(np.float64)
    mse = np.mean((original - reconstructed) ** 2)
    if mse == 0:
        return float("inf")
    return float(10.0 * np.log10(255.0 ** 2 / mse))


def compute_ssim(original: np.ndarray, reconstructed: np.ndarray) -> float:
    """SSIM between two grayscale uint8 images, returns value in [-1, 1]."""
    return float(ssim(original, reconstructed, data_range=255))


def get_compression_analysis(
    image: np.ndarray,
    quantization_factor: float = 24.0,
) -> dict:
    """
    Run compression pipeline with step capture, then compute PSNR and SSIM
    between the original and reconstructed grayscale image.

    Returns a dict with all 8 visualization steps plus quality metrics.
    """
    if image.ndim == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()

    bitstream, code_to_symbol, meta, steps = compress_image(
        gray, quantization_factor=quantization_factor, capture_steps=True
    )

    reconstructed = steps["reconstructed"]
    psnr = compute_psnr(gray, reconstructed)
    ssim_val = compute_ssim(gray, reconstructed)

    compressed_bits = steps["bitstream_length"]
    original_bits = gray.size * 8

    return {
        "steps": steps,
        "meta": meta,
        "metrics": {
            "psnr_db": psnr,
            "ssim": ssim_val,
            "original_bits": original_bits,
            "compressed_bits": compressed_bits,
            "compression_ratio": compressed_bits / original_bits if original_bits > 0 else 1.0,
        },
    }


def get_phash_debug(image: np.ndarray) -> dict:
    """Return all 6 pHash intermediate arrays for visualization."""
    return compute_phash(image, debug=True)
