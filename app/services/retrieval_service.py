# NOTE:- NEED TO REVIEW THIS SERVICE

"""
Retrieval service for downloading and decompressing compressed images from MinIO.
"""

import os
import pickle
from pathlib import Path
from uuid import uuid4

import boto3
import cv2
from botocore.config import Config
from dotenv import load_dotenv

from app.core.compression import decompress_image
from app.core.similarity import BKTree
from app.database.connection import get_session
from app.database.models import Image, CompressionResult

load_dotenv(override=True)


class Retrieval:
    def __init__(self, bucket: str = "main-bucket"):
        url = os.getenv("MINIO_SERVER")
        port = os.getenv("MINIO_PORT")
        self.client = boto3.client(
            "s3",
            endpoint_url=f"http://{url}:{port}",
            aws_access_key_id=os.getenv("MINIO_ROOT_USER"),
            aws_secret_access_key=os.getenv("MINIO_ROOT_PASSWORD"),
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )
        self.bucket = bucket

    def download_and_decompress(self, image_id: str, output_path: str | Path | None = None):
        """
        Download compressed image from MinIO and decompress it.
        
        Args:
            image_id: UUID of the image record
            output_path: Where to save decompressed image (optional)
            
        Returns:
            Decompressed image as BGR numpy array or None if failed
        """
        session = get_session()
        try:
            # Get image record from DB
            image_record = session.query(Image).filter_by(image_id=image_id).first()
            if not image_record:
                raise ValueError(f"Image {image_id} not found in database")
            
            # Extract object name from stored_path (s3://bucket/object_name)
            obj_name = image_record.stored_path.split("/")[-1]
            
            # Download from MinIO
            temp_path = Path(f"/tmp/{uuid4().hex}.bin")
            self.client.download_file(self.bucket, obj_name, str(temp_path))
            
            # Deserialize compression data
            with open(temp_path, "rb") as f:
                compression_data = pickle.load(f)
            
            # Decompress each channel
            decompressed_channels = []
            for bitstream, code_to_symbol, meta in compression_data:
                channel = decompress_image(bitstream, code_to_symbol, meta)
                decompressed_channels.append(channel.astype("uint8"))
            
            # Merge channels back to BGR
            decompressed_image = cv2.merge(decompressed_channels)
            
            # Save if output path provided
            if output_path:
                output_path = Path(output_path)
                output_path.parent.mkdir(parents=True, exist_ok=True)
                cv2.imwrite(str(output_path), decompressed_image)
                print(f"Decompressed image saved: {output_path}")
            
            # Cleanup
            temp_path.unlink()
            
            return decompressed_image
            
        except Exception as e:
            print(f"Error retrieving image: {e}")
            return None
        finally:
            session.close()

    def get_image_metadata(self, image_id: str):
        """Get metadata for an image without downloading it."""
        session = get_session()
        try:
            image = session.query(Image).filter_by(image_id=image_id).first()
            if not image:
                return None
            
            return {
                "image_id": image.image_id,
                "filename": image.filename,
                "width": image.width,
                "height": image.height,
                "file_size": image.file_size,
                "sha256": image.sha256,
                "stored_path": image.stored_path,
            }
        finally:
            session.close()

    def find_similar_images(self, query_phash: str, max_distance: int = 10) -> list[dict]:
        """
        Find visually similar images using the BK-Tree and perceptual hashes.
        Returns a list of image metadata (no images are decompressed here).
        
        Args:
            query_phash: The 64-bit pHash hex string of the source image.
            max_distance: Maximum Hamming distance for matches (0 = identical, 10 = similar).
        """
        session = get_session()
        try:
            # 1. Fetch all pHashes from the database to build our search tree
            results = session.query(CompressionResult.image_id, CompressionResult.metadata_json).all()
            
            # 2. Build the BK-Tree (In a true production app, this tree is cached in RAM)
            tree = BKTree()
            for img_id, m_json in results:
                phash_val = m_json.get("phash")
                if phash_val:
                    tree.add(phash_val, img_id)
            
            # 3. Query the tree for closest matches
            matches = tree.search(query_phash, max_distance=max_distance)
            
            # 4. Construct metadata details for the matches
            similarity_results = []
            for dist, phash_match, match_id in matches:
                metadata = self.get_image_metadata(match_id)
                if metadata:
                    metadata["hamming_distance"] = dist
                    metadata["phash"] = phash_match
                    similarity_results.append(metadata)
            
            return similarity_results
        except Exception as e:
            print(f"Error finding similar images: {e}")
            return []
        finally:
            session.close()
