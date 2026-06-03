import json
import io
import os

import boto3
import cv2
import numpy as np
from botocore.client import Config
from botocore.exceptions import ClientError
from dotenv import load_dotenv

from app.core.compression import decompress_image
from app.database.connection import get_session
from app.database.models import Image

load_dotenv(override=True)


def _minio_client():
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("MINIO_ENDPOINT", "http://localhost:9000"),
        aws_access_key_id=os.getenv("MINIO_ROOT_USER", "minioadmin"),
        aws_secret_access_key=os.getenv("MINIO_ROOT_PASSWORD", "daa-storages"),
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


def download_and_decompress(image_id: str) -> tuple[bytes, str]:
    """
    Fetch the JSON compression archive for image_id from MinIO, run the full
    Huffman + IDCT decompression on each BGR channel, and return JPEG bytes
    along with the original filename.

    Returns:
        tuple[bytes, str]: A tuple of (JPEG bytes, original filename from database)

    Raises LookupError if image_id is not in the database.
    Raises RuntimeError if the MinIO object cannot be retrieved or is malformed.
    """
    session = get_session()
    try:
        image_row = session.query(Image).filter(Image.image_id == image_id).first()
    finally:
        session.close()

    if image_row is None:
        raise LookupError(f"No image found with id: {image_id}")

    # stored_path is "s3://<bucket>/<object_name>"
    stored_path: str = image_row.stored_path
    parts = stored_path.removeprefix("s3://").split("/", 1)
    if len(parts) != 2:
        raise RuntimeError(f"Cannot parse stored_path: {stored_path}")
    bucket, object_name = parts

    client = _minio_client()
    try:
        response = client.get_object(Bucket=bucket, Key=object_name)
        raw = response["Body"].read()
    except ClientError as exc:
        raise RuntimeError(f"MinIO download failed: {exc}") from exc

    # Each channel is stored as {bitstream, code_to_symbol, meta} in a JSON array.
    # code_to_symbol values are JSON arrays [value, count]; rle_decode unpacks them fine.
    channel_data: list = json.loads(raw)

    channels = []
    for ch in channel_data:
        channel = decompress_image(ch["bitstream"], ch["code_to_symbol"], ch["meta"])
        channels.append(channel.astype(np.uint8))

    bgr = cv2.merge(channels)
    ok, buf = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 95])
    if not ok:
        raise RuntimeError("Failed to encode decompressed image as JPEG")

    return buf.tobytes(), image_row.filename
