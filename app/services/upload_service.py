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

    def _get_image_dimensions(self, path: Path):
        try:
            with PILImage.open(path) as image:
                return image.size
        except Exception:
            return 0, 0

    def _build_image_record(self, path: Path, obj_name: str):
        width, height = self._get_image_dimensions(path)
        file_bytes = path.read_bytes()
        sha256 = hashlib.sha256(file_bytes).hexdigest()
        file_size = path.stat().st_size

        return {
            "image_id": uuid4().hex,
            "filename": path.name,
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

        try:
            self.client.upload_file(str(path), self.bucket, obj_name)

            image_record = self._build_image_record(path, obj_name)
            compressed_size = image_record["file_size"]
            original_size = kwargs.get("original_size", compressed_size)
            compression_ratio = kwargs.get("compression_ratio", compressed_size / original_size if original_size else 1.0)

            session = get_session()
            try:
                image_row = Image(**image_record)
                session.add(image_row)
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
            print(f"[Upload Error MinIO]: {e}")
            return False
        return {
            "success": True,
            "bucket": self.bucket,
            "object_name": obj_name,
            "image_id": image_record["image_id"],
            "stored_path": image_record["stored_path"],
            "sha256": image_record["sha256"],
        }