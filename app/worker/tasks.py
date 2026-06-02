from pathlib import Path
import pickle

import cv2

from .celery_app import app
from app.core.compression import compress_image
from app.core.phash import compute_phash
from app.services.upload_service import Upload


@app.task(bind=True, name="worker.process_compressed_image")
def process_compressed_image(
	self,
	image_path: str,
	quantization_factor: float = 24,
	upload_needed: bool = True,
	obj_name: str | None = None,
	phash_value: str | None = None,
):
	def _progress(step: int, total: int, label: str):
		self.update_state(
			state="PROGRESS",
			meta={"step": step, "total": total, "label": label},
		)

	path = Path(image_path)
	original_size = path.stat().st_size
	image = cv2.imread(str(path), cv2.IMREAD_COLOR)
	if image is None:
		raise ValueError(f"Could not read image: {image_path}")

	_progress(1, 4, "Computing perceptual hash")
	phash_value = phash_value or compute_phash(image)

	_progress(2, 4, "Compressing image channels")
	compression_data = [compress_image(channel, quantization_factor=quantization_factor) for channel in cv2.split(image)]

	_progress(3, 4, "Serializing compressed data")
	compressed_file = path.with_name(f"{path.stem}_compressed.bin")
	with open(compressed_file, "wb") as f:
		pickle.dump(compression_data, f)

	compressed_size = compressed_file.stat().st_size
	compression_ratio = compressed_size / original_size if original_size > 0 else 1.0

	result = {
		"image_path": str(path),
		"phash": phash_value,
		"original_size": original_size,
		"compressed_size": compressed_size,
		"compression_ratio": compression_ratio,
	}

	if not upload_needed:
		compressed_file.unlink()
		return result

	_progress(4, 4, "Uploading to object storage")
	result["upload_response"] = Upload().upload(
		path=compressed_file,
		obj_name=obj_name or compressed_file.name,
		metadata={"phash": phash_value, "quantization_factor": quantization_factor},
		original_size=original_size,
		compression_ratio=compression_ratio,
	)
	compressed_file.unlink()
	result["stored_object"] = obj_name or compressed_file.name
	return result