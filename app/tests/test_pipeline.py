"""
Comprehensive test script for the image compression + upload pipeline.
Tests: Redis, MinIO, PostgreSQL, compression, worker task, and end-to-end flow.
"""

import sys
from pathlib import Path
import pickle
from uuid import uuid4
import numpy as np
import cv2
from io import BytesIO

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.core.compression import compress_image, decompress_image
from app.services.upload_service import Upload
from app.services.retrieval_service import Retrieval
from app.database.models import Base, Image as ImageModel, CompressionResult
from app.database.connection import engine, get_session
from app.worker.tasks import process_compressed_image
import redis


def create_test_image(size=(100, 100), filename="test_image.png"):
    """Create a simple test image."""
    img = np.random.randint(0, 256, (size[0], size[1], 3), dtype=np.uint8)
    path = Path(__file__).parent.parent.parent / "assets" / filename
    path.parent.mkdir(exist_ok=True)
    cv2.imwrite(str(path), img)
    print(f"✓ Created test image: {path}")
    return path


def test_redis_connection():
    """Test Redis connectivity."""
    try:
        r = redis.Redis(host="localhost", port=6379, db=0, socket_connect_timeout=5)
        r.ping()
        print("✓ Redis connected successfully")
        return True
    except Exception as e:
        print(f"✗ Redis connection failed: {e}")
        return False


def test_minio_connection():
    """Test MinIO connectivity."""
    try:
        upload = Upload()
        print(f"✓ MinIO connected successfully (bucket: {upload.bucket})")
        return True
    except Exception as e:
        print(f"✗ MinIO connection failed: {e}")
        return False


def test_database_connection():
    """Test PostgreSQL connectivity and create tables."""
    try:
        Base.metadata.create_all(engine)
        print("✓ Database tables created successfully")
        return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False


def test_compression_roundtrip():
    """Test compression and decompression."""
    print("\n--- Testing Compression/Decompression ---")
    
    # Create test data
    test_channel = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
    q_factor = 24.0
    
    # Compress
    bitstream, code_to_symbol, meta = compress_image(test_channel, quantization_factor=q_factor)
    
    if not bitstream:
        print("✗ Compression failed: empty bitstream")
        return False
    
    original_bits = test_channel.size * 8
    compressed_bits = len(bitstream)
    ratio = compressed_bits / original_bits
    
    print(f"  Original bits: {original_bits}")
    print(f"  Compressed bits: {compressed_bits}")
    print(f"  Compression ratio: {ratio:.2%}")
    
    # Decompress
    decompressed = decompress_image(bitstream, code_to_symbol, meta)
    
    if decompressed is None:
        print("✗ Decompression failed")
        return False
    
    print("✓ Compression/Decompression successful")
    return True


def test_serialization():
    """Test pickle serialization of compression data."""
    print("\n--- Testing Serialization ---")
    
    test_channel = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
    compression_data = compress_image(test_channel, quantization_factor=24.0)
    
    # Serialize
    buffer = BytesIO()
    pickle.dump(compression_data, buffer)
    buffer.seek(0)
    
    # Deserialize
    loaded = pickle.load(buffer)
    
    if loaded == compression_data:
        print("✓ Serialization successful")
        return True
    else:
        print("✗ Serialization failed: data mismatch")
        return False


def test_minio_upload():
    """Test uploading a file to MinIO."""
    print("\n--- Testing MinIO Upload ---")
    
    test_image_path = create_test_image(filename="minio_test.png")
    
    try:
        upload = Upload()
        result = upload.upload(
            path=test_image_path,
            obj_name="test_upload.bin",
            metadata={"test": "data"},
            original_size=1024,
            compression_ratio=0.5
        )
        
        if result.get("success"):
            print(f"✓ File uploaded to MinIO")
            print(f"  Image ID: {result.get('image_id')}")
            print(f"  Stored path: {result.get('stored_path')}")
            return True
        else:
            print(f"✗ Upload failed: {result}")
            return False
    except Exception as e:
        print(f"✗ Upload error: {e}")
        return False


def test_database_storage():
    """Test storing compressed image metadata in database."""
    print("\n--- Testing Database Storage ---")
    
    try:
        session = get_session()
        image_id = f"test-id-{uuid4().hex}"
        
        session.query(CompressionResult).filter_by(image_id=image_id).delete()
        session.query(ImageModel).filter_by(image_id=image_id).delete()
        session.commit()

        # Create test image record
        image = ImageModel(
            image_id=image_id,
            filename="test.bin",
            stored_path="s3://bucket/test.bin",
            width=100,
            height=100,
            file_size=5120,
            sha256=f"sha-{uuid4().hex}"
        )
        session.add(image)
        session.flush()
        
        # Create compression result
        compression = CompressionResult(
            image_id=image.image_id,
            original_size=10240,
            compressed_size=5120,
            compression_ratio=0.5,
            metadata_json={"q_factor": 24.0}
        )
        session.add(compression)
        session.commit()
        
        # Verify retrieval
        retrieved = session.query(ImageModel).filter_by(image_id=image_id).first()
        if retrieved:
            print(f"✓ Image record stored and retrieved")
            print(f"  Filename: {retrieved.filename}")
            
            comp_result = session.query(CompressionResult).filter_by(image_id=image_id).first()
            if comp_result:
                print(f"✓ Compression result stored and retrieved")
                print(f"  Compression ratio: {comp_result.compression_ratio}")
                return True
        else:
            print("✗ Could not retrieve image record")
            return False
            
    except Exception as e:
        print(f"✗ Database storage test failed: {e}")
        return False


def test_worker_task():
    """Test the Celery worker task (without actually running Celery)."""
    print("\n--- Testing Worker Task (Sync Mode) ---")
    
    test_image_path = create_test_image(filename="worker_test.png")
    
    try:
        # Call task directly (synchronous mode)
        result = process_compressed_image(
            image_path=str(test_image_path),
            quantization_factor=24.0,
            upload_needed=False,  # Don't upload in test
            obj_name="worker_test.bin",
            phash_value="0b0001010101"
        )
        
        if result:
            print("✓ Worker task executed successfully")
            print(f"  Original size: {result.get('original_size')} bytes")
            print(f"  Compressed size: {result.get('compressed_size')} bytes")
            print(f"  Compression ratio: {result.get('compression_ratio'):.2%}")
            print(f"  phash: {result.get('phash')}")
            return True
        else:
            print("✗ Worker task returned no result")
            return False
            
    except Exception as e:
        print(f"✗ Worker task failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_end_to_end():
    """Test complete pipeline: compress -> upload -> retrieve -> decompress."""
    print("\n--- Testing End-to-End Pipeline ---")
    
    test_image_path = create_test_image(filename="e2e_test.png")
    original_image = cv2.imread(str(test_image_path), cv2.IMREAD_COLOR)
    
    try:
        # Step 1: Process with worker (with upload)
        result = process_compressed_image(
            image_path=str(test_image_path),
            quantization_factor=24.0,
            upload_needed=True,
            obj_name="e2e_test.bin",
            phash_value="0b1010101010"
        )
        
        if not result.get("upload_response", {}).get("success"):
            print("✗ Upload failed")
            return False
        
        image_id = result["upload_response"]["image_id"]
        print(f"  ✓ Image uploaded (ID: {image_id})")
        
        # Step 2: Retrieve metadata
        retrieval = Retrieval()
        metadata = retrieval.get_image_metadata(image_id)
        if not metadata:
            print("✗ Could not retrieve metadata")
            return False
        print(f"  ✓ Metadata retrieved: {metadata['filename']}")
        
        # Step 3: Download and decompress
        decompressed_image = retrieval.download_and_decompress(
            image_id=image_id,
            output_path=Path(__file__).parent.parent.parent / "assets" / "e2e_decompressed.png"
        )
        
        if decompressed_image is None:
            print("✗ Decompression failed")
            return False
        
        # Step 4: Verify shapes match
        if decompressed_image.shape == original_image.shape:
            print(f"✓ Decompressed image shape matches original: {decompressed_image.shape}")
        else:
            print(f"✗ Shape mismatch: original {original_image.shape}, decompressed {decompressed_image.shape}")
            return False
        
        print("✓ End-to-end pipeline successful!")
        return True
        
    except Exception as e:
        print(f"✗ End-to-end test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("AlgoStore Compression Pipeline - Integration Tests")
    print("=" * 60)
    
    print("\n--- Checking External Services ---")
    redis_ok = test_redis_connection()
    minio_ok = test_minio_connection()
    db_ok = test_database_connection()
    
    if not (redis_ok and minio_ok and db_ok):
        print("\n✗ Not all services are available. Make sure Docker containers are running:")
        print("  docker-compose -f docker/docker-compose.yml up -d")
        return
    
    print("\n--- Running Core Tests ---")
    
    tests = [
        ("Compression Roundtrip", test_compression_roundtrip),
        ("Serialization", test_serialization),
        ("MinIO Upload", test_minio_upload),
        ("Database Storage", test_database_storage),
        ("Worker Task", test_worker_task),
        ("End-to-End Pipeline", test_end_to_end),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"✗ {test_name} crashed: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 60)
    
    if failed == 0:
        print("✓ All tests passed!")
    else:
        print(f"✗ {failed} test(s) failed")


if __name__ == "__main__":
    main()
