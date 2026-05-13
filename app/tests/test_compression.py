import cv2
from pathlib import Path
import numpy as np
from app.core.compression import compress_image, decompress_image

# ------------------------------------------------------------
# Set your image path here
# ------------------------------------------------------------
ROOT = Path(__file__).parent.parent.parent
IMAGE_PATH = ROOT / "assets" / "test.png"

Q_FACTOR = 2.0


def compress_color_image(bgr_img: np.ndarray, q_factor: float):
    """Compress each B, G, R channel separately."""
    channels = cv2.split(bgr_img)
    packed = []

    total_bits = 0
    for ch in channels:
        bitstream, code_to_symbol, meta = compress_image(ch, quantization_factor=q_factor)
        packed.append((bitstream, code_to_symbol, meta))
        total_bits += len(bitstream)

    return packed, total_bits


def decompress_color_image(packed):
    """Decompress each channel and merge back to BGR."""
    reconstructed_channels = []
    for bitstream, code_to_symbol, meta in packed:
        ch = decompress_image(bitstream, code_to_symbol, meta)
        reconstructed_channels.append(ch.astype(np.uint8))
    return cv2.merge(reconstructed_channels)


def main():
    original_bgr = cv2.imread(IMAGE_PATH, cv2.IMREAD_COLOR)
    if original_bgr is None:
        print(f"Error: Could not load image from: {IMAGE_PATH}")
        return

    packed, compressed_bits = compress_color_image(original_bgr, Q_FACTOR)
    reconstructed_bgr = decompress_color_image(packed)

    h, w, c = original_bgr.shape
    original_bits = h * w * c * 8
    ratio = compressed_bits / original_bits if original_bits else 1.0

    print("---- Color Compression Test ----")
    print(f"Image path:            {IMAGE_PATH}")
    print(f"Shape (H,W,C):         {original_bgr.shape}")
    print(f"Q factor:              {Q_FACTOR}")
    print(f"Original size (bits):  {original_bits:,}")
    print(f"Compressed bits:       {compressed_bits:,}")
    print(f"Compression ratio:     {ratio:.2%}")

    out_path = "app/tests/compressed_output_color.png"
    cv2.imwrite(out_path, reconstructed_bgr)
    print(f"Saved reconstructed color image: {out_path}")

    cv2.imshow("Original (Color)", original_bgr)
    cv2.imshow(f"Compressed/Reconstructed Color (Q={Q_FACTOR})", reconstructed_bgr)

    print("Press any key in image window to close.")
    cv2.waitKey(0)
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()