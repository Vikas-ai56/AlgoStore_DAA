#!/usr/bin/env python
"""
Health check script - Verify all services are ready before running tests.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import redis
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from sqlalchemy import text

from app.database.connection import engine

def check_redis():
    """Check Redis connectivity."""
    try:
        r = redis.Redis(host="localhost", port=6379, db=0, socket_connect_timeout=5)
        r.ping()
        return True, "✓ Redis ready"
    except Exception as e:
        return False, f"✗ Redis failed: {e}"

def check_minio():
    """Check MinIO connectivity."""
    try:
        client = boto3.client(
            "s3",
            endpoint_url="http://localhost:9000",
            aws_access_key_id="minioadmin",
            aws_secret_access_key="daa-storages",
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )
        client.list_buckets()
        return True, "✓ MinIO ready"
    except Exception as e:
        return False, f"✗ MinIO failed: {e}"

def check_postgres():
    """Check PostgreSQL connectivity."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "✓ PostgreSQL ready"
    except Exception as e:
        return False, f"✗ PostgreSQL failed: {e}"

def check_tables():
    """Check if required tables exist."""
    try:
        with engine.connect() as conn:
            # Check Image table
            conn.execute(text("SELECT 1 FROM \"Image\" LIMIT 1"))
            # Check CompressionResult table
            conn.execute(text("SELECT 1 FROM \"CompressionResult\" LIMIT 1"))
        return True, "✓ All tables exist"
    except Exception as e:
        return False, f"✗ Tables missing or error: {e}"

def main():
    print("=" * 60)
    print("AlgoStore Pipeline - Health Check")
    print("=" * 60 + "\n")
    
    checks = [
        ("Redis", check_redis),
        ("MinIO", check_minio),
        ("PostgreSQL", check_postgres),
        ("Database Tables", check_tables),
    ]
    
    all_passed = True
    
    for name, check_func in checks:
        try:
            passed, message = check_func()
            print(f"{name:20} {message}")
            if not passed:
                all_passed = False
        except Exception as e:
            print(f"{name:20} ✗ Unexpected error: {e}")
            all_passed = False
    
    print("\n" + "=" * 60)
    
    if all_passed:
        print("✓ All services ready! You can run tests now.")
        print("\nRun tests with:")
        print("  python app/tests/test_pipeline.py")
        return 0
    else:
        print("✗ Some services are not ready.")
        print("\nStart services with:")
        print("  cd docker")
        print("  docker-compose -f docker-compose.yml up -d")
        print("\nCreate database tables with:")
        print("  python app/database/session.py")
        return 1

if __name__ == "__main__":
    sys.exit(main())
