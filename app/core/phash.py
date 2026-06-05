from pathlib import Path

import cv2
import numpy as np
from scipy.fft import dct


def _load_grayscale(image: np.ndarray | str | Path) -> np.ndarray:
	if isinstance(image, (str, Path)):
		loaded = cv2.imread(str(image), cv2.IMREAD_GRAYSCALE)
		if loaded is None:
			raise ValueError(f"Could not read image: {image}")
		return loaded.astype(np.float32)

	if image.ndim == 3:
		return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32)
	if image.ndim == 2:
		return image.astype(np.float32)
	raise ValueError(f"Unsupported image shape: {image.shape}")


def compute_phash(
	image: np.ndarray | str | Path,
	hash_size: int = 8,
	highfreq_factor: int = 4,
	debug: bool = False,
) -> "str | dict":
	"""Compute a 64-bit DCT perceptual hash as a 16-character hex string.

	When debug=True returns a dict with all 6 intermediate arrays plus the hash,
	useful for the pHash step visualizer.
	"""
	gray = _load_grayscale(image)
	size = hash_size * highfreq_factor
	resized = cv2.resize(gray, (size, size), interpolation=cv2.INTER_AREA)
	dct_rows = dct(resized, axis=0, norm="ortho")
	dct_values = dct(dct_rows, axis=1, norm="ortho")
	low_freq = dct_values[:hash_size, :hash_size]
	mean = low_freq[1:, 1:].mean()
	bits = low_freq >= mean
	bit_string = "".join("1" if bit else "0" for bit in bits.flatten())
	phash_hex = f"{int(bit_string, 2):016x}"

	if not debug:
		return phash_hex

	return {
		"gray": gray,
		"resized": resized,
		"dct_rows": dct_rows,
		"dct_full": dct_values,
		"low_freq": low_freq,
		"hash_bits": bits,
		"phash": phash_hex,
	}


def phash_distance(hash_a: str, hash_b: str) -> int:
	"""Return the Hamming distance between two hexadecimal pHash values."""
	value_a = int(hash_a, 16)
	value_b = int(hash_b, 16)
	return (value_a ^ value_b).bit_count()
