## Pipeline Test Guide

### Step 1: Start Docker Services
```bash
cd docker
docker-compose -f docker-compose.yml up -d
```

This starts:
- **Redis** on `localhost:6379` (Celery broker)
- **MinIO** on `localhost:9000` (S3-compatible storage)
- **PostgreSQL** on `localhost:5432` (Database)

Verify services are running:
```bash
docker-compose ps
```

### Step 2: Create Database Tables
```bash
python app/database/session.py
```

Output should show:
```
All tables (including User) created successfully.
```

### Step 3: Run Integration Tests
```bash
python app/tests/test_pipeline.py
```

This tests:
- ✓ Redis connectivity
- ✓ MinIO connectivity  
- ✓ PostgreSQL connectivity
- ✓ Compression/decompression roundtrip
- ✓ Serialization (pickle)
- ✓ MinIO file upload
- ✓ Database storage
- ✓ Worker task execution

### Step 4: View MinIO Console (Optional)
Open http://localhost:9000 in browser
- Username: `minioadmin`
- Password: `daa-storages`

### Step 5: Run Celery Worker (For Async Tasks)
```bash
# Terminal 1: Start worker
celery -A app.worker.celery_app worker --loglevel=info

# Terminal 2: Test with async task
from app.worker.tasks import process_compressed_image
task = process_compressed_image.delay(
    image_path="path/to/image.png",
    quantization_factor=24.0,
    upload_needed=True,
    obj_name="my_image.bin",
    phash_value="0b1010..."
)
print(task.get())  # Wait for result
```

### Troubleshooting

**Redis connection failed:**
```bash
docker-compose logs redis
docker-compose restart redis
```

**MinIO connection failed:**
```bash
docker-compose logs minio
docker-compose restart minio
```

**PostgreSQL connection failed:**
```bash
docker-compose logs postgres
docker-compose restart postgres
```

**Clear all data:**
```bash
docker-compose down -v
docker-compose up -d
python app/database/session.py
```
