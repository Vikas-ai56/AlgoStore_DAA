import hashlib
import logging
import os
from pathlib import Path
from uuid import uuid4

import boto3
from PIL import Image as PILImage
from botocore.client import Config
from botocore.exceptions import ClientError
from dotenv import load_dotenv

from app.database.connection import get_session
from app.database.models import CompressionResult, Image

load_dotenv(override=True)


class Upload:
    def __init__(self, bucket: str = "main-bucket"):
        self.client = boto3.client(
            "s3",
            endpoint_url=os.getenv("MINIO_ENDPOINT", "http://localhost:9000"),
            aws_access_key_id=os.getenv("MINIO_ROOT_USER", "minioadmin"),
            aws_secret_access_key=os.getenv("MINIO_ROOT_PASSWORD", "daa-storages"),
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )
        self.bucket = bucket
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except ClientError:
            self.client.create_bucket(Bucket=self.bucket)

    def _build_image_record(
        self,
        path: Path,
        obj_name: str,
        sha256: str,
        original_filename: str | None = None,
        width: int | None = None,
        height: int | None = None,
    ) -> dict:
        file_size = path.stat().st_size
        # Use caller-supplied dims (from cv2.imread shape) if available;
        # PIL fallback only for direct image uploads, returns 0,0 for JSON files.
        if width is None or height is None:
            try:
                with PILImage.open(path) as img:
                    width, height = img.size
            except Exception:
                width, height = 0, 0
        return {
            "image_id": uuid4().hex,
            "filename": original_filename or path.name,
            "stored_path": f"s3://{self.bucket}/{obj_name}",
            "width": width,
            "height": height,
            "file_size": file_size,
            "sha256": sha256,
        }

    def upload(self, path: str | Path, obj_name: str | None = None, metadata: dict | None = None, **kwargs):
        path = Path(path)
        if not path.exists():
            raise ValueError("Image not found")

        obj_name = obj_name or path.name
        original_filename = kwargs.get("original_filename")
        width = kwargs.get("width")
        height = kwargs.get("height")

        # Pre-compute sha256 for dedup check before touching MinIO
        file_bytes = path.read_bytes()
        sha256 = hashlib.sha256(file_bytes).hexdigest()

        session = get_session()
        try:
            existing = session.query(Image).filter(Image.sha256 == sha256).first()
            if existing:
                return {
                    "success": True,
                    "bucket": self.bucket,
                    "object_name": obj_name,
                    "image_id": existing.image_id,
                    "stored_path": existing.stored_path,
                    "sha256": sha256,
                }
        finally:
            session.close()

        try:
            self.client.upload_file(str(path), self.bucket, obj_name)

            image_record = self._build_image_record(
                path, obj_name, sha256,
                original_filename=original_filename,
                width=width,
                height=height,
            )
            compressed_size = image_record["file_size"]
            original_size = kwargs.get("original_size", compressed_size)
            compression_ratio = kwargs.get("compression_ratio", compressed_size / original_size if original_size else 1.0)

            session = get_session()
            try:
                session.add(Image(**image_record))
                session.flush()
                session.add(
                    CompressionResult(
                        image_id=image_record["image_id"],
                        original_size=original_size,
                        compressed_size=compressed_size,
                        compression_ratio=compression_ratio,
                        metadata_json=metadata or {},
                    )
                )
                session.commit()
            except Exception:
                session.rollback()
                raise
            finally:
                session.close()

        except ClientError as e:
            logging.error(e)
            return False

        return {
            "success": True,
            "bucket": self.bucket,
            "object_name": obj_name,
            "image_id": image_record["image_id"],
            "stored_path": image_record["stored_path"],
            "sha256": sha256,
        }